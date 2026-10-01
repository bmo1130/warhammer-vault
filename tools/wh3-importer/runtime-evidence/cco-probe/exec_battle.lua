-- Canonical external-file battle probe. Read-only CCO queries; no DB/game writes.
-- install.ps1 prepends WV_CCO_CONFIG. F9 snapshots/cursor; then F10 traces.
WV_CCO_PROBE = WV_CCO_PROBE or {serial = 0, sequence = 0}
local P = WV_CCO_PROBE
local C = WV_CCO_CONFIG or {}
-- A configured session can span several battles, whose Lua counters may reset.
-- Namespace with an opaque per-VM anchor + available clocks, without RNG calls.
if not P.battleToken then
    P.identityAnchor = {}
    local function clock_text(fn)
        local ok, v = pcall(fn)
        return ok and tostring(v) or "UNAVAILABLE"
    end
    P.battleToken = tostring(P.identityAnchor) .. ":" .. clock_text(function() return get_timestamp() end) .. ":" ..
        clock_text(function() return os.time() end) .. ":" .. clock_text(function() return os.clock() end)
end
local timer_name, listener_name = "wv_cco_trace", "wv_cco_f10"
local function array(t) return setmetatable(t or {}, {__json_array = true}) end

local function invalid_number(v)
    if v ~= v then return true end
    local huge = math and math.huge
    return huge ~= nil and (v == huge or v == -huge)
end
local function json(v)
    local t = type(v)
    if t == "nil" then return "null" end
    if t == "boolean" then return v and "true" or "false" end
    if t == "number" then
        if invalid_number(v) then return "null" end
        return tostring(v)
    end
    if t == "string" then
        return '"' .. v:gsub('[%z\1-\31\\"]', function(ch)
            if ch == '"' then return '\\"' end
            if ch == '\\' then return '\\\\' end
            return string.format('\\u%04x', string.byte(ch))
        end) .. '"'
    end
    if t ~= "table" then return json(tostring(v)) end
    local keys, parts = {}, {}
    if getmetatable(v) and getmetatable(v).__json_array then
        for i = 1, #v do parts[#parts + 1] = json(v[i]) end
        return '[' .. table.concat(parts, ',') .. ']'
    end
    for k in pairs(v) do keys[#keys + 1] = k end
    table.sort(keys)
    for _, k in ipairs(keys) do parts[#parts + 1] = json(tostring(k)) .. ':' .. json(v[k]) end
    return '{' .. table.concat(parts, ',') .. '}'
end
local function safe(fn)
    local ok, value = pcall(fn)
    if not ok then return {status = "UNSUPPORTED", error = tostring(value):sub(1, 240)} end
    if value == nil then return {status = "NULL"} end
    local t = type(value)
    if t ~= "string" and t ~= "boolean" and t ~= "number" and t ~= "table" then
        return {status = "UNSERIALIZABLE", valueType = t}
    end
    if t == "number" and invalid_number(value) then return {status = "INVALID_NUMBER"} end
    return {status = "VALUE", value = value}
end
local function query(ctx, expression) return safe(function() return ctx:Call(expression) end) end
local function context(ctx, expression)
    local ok, result = pcall(function() return ctx:Call(expression) end)
    if not ok or result == nil then return nil end
    return result
end
local function fields(ctx, names)
    local result = {}
    for _, name in ipairs(names) do result[name] = query(ctx, name) end
    return result
end
local function timestamp()
    return safe(function() return bm:time_elapsed_ms() end)
end
local function emit(kind, data)
    P.sequence = P.sequence + 1
    local event = {format = "warhammer-vault-cco-probe-v1", sessionId = (C.sessionId or "UNCONFIGURED") .. ":" .. P.battleToken,
        sequence = P.sequence, runId = P.runId or "startup", kind = kind, timestamp = timestamp(),
        metadata = C, data = data}
    local line = "WH3_RUNTIME_PROBE|" .. json(event)
    local ok = pcall(function() out(line) end)
    if not ok then pcall(function() bm:out(line) end) end
end
local unit_fields = {"UniqueUiId", "NumEntities", "NumEntitiesInitial", "HealthValue", "HealthMax",
    "PrimaryAmmoPercent", "SecondaryAmmoPercent", "IsFiringMissiles", "ActiveProjectileContext.Key", "ReloadPercentMax",
    "UnitRecordContext.Key", "UnitRecordContext.UnitLandRecordContext.Key", "IsPlayerUnit", "IsInMelee"}
local entity_fields = {"Key", "EntityRecordContext.Key", "IsMan", "IsEngine", "IsAlive", "IsReloading",
    "ReloadPercent", "ReloadRemainingTime", "UnitContext.UniqueUiId"}
local lists = {"ManList", "MountList", "EngineList", "EntityList"}
local function selected()
    local ok, selection = pcall(function() return cco("CcoBattleSelection", "") end)
    if not ok or not selection then return nil end
    local unit = context(selection, "FirstUnitContext")
    local own = query(unit, "IsPlayerUnit")
    if own.status ~= "VALUE" or own.value ~= true then
        emit("ERROR", {reason = "SELECTED_PLAYER_UNIT_REQUIRED", IsPlayerUnit = own})
        return nil
    end
    return unit
end
local function entity(ctx, with_position)
    local result = fields(ctx, entity_fields)
    if with_position then
        result.Position = safe(function()
            local x, y, z, w = ctx:Call("Position")
            if x == nil then return nil end
            if type(x) == "table" then return x end
            if type(x) ~= "number" or type(y) ~= "number" or type(z) ~= "number" then error("Unsupported Vector4 representation") end
            return array({x, y, z, w})
        end)
    end
    return result
end
local function capture(unit, mode, sample)
    local state = {unit = fields(unit, unit_fields), lists = {}}
    for _, name in ipairs(lists) do
        local n = query(unit, name .. ".Size")
        local list = {size = n, entries = array(), complete = false}
        state.lists[name] = list
        if n.status == "VALUE" and type(n.value) == "number" and n.value >= 0 and n.value % 1 == 0 and n.value <= 512 then
            list.complete = true
            for i = 0, n.value - 1 do
                local e = context(unit, name .. ".At(" .. i .. ")")
                if not e then list.complete = false end
                list.entries[#list.entries + 1] = {index = i, fields = entity(e, mode == "SNAPSHOT")}
            end
        elseif n.status == "VALUE" then list.reason = "INVALID_OR_OVER_512_LIMIT" end
    end
    -- Chunk entity rows: avoid a single enormous log line and retain partial logs.
    local unit_encoded = json(state.unit)
    local unchanged = mode == "TRACE" and P.previous.unit == unit_encoded
    emit(mode .. "_UNIT", {sample = sample, fields = not unchanged and state.unit or nil, unchanged = unchanged})
    P.previous.unit = unit_encoded
    for _, name in ipairs(lists) do
        local list = state.lists[name]
        emit("COMPONENT_LIST", {mode = mode, sample = sample, list = name, size = list.size, complete = list.complete, reason = list.reason})
        for _, row in ipairs(list.entries) do
            local key = mode .. ":" .. name .. ":" .. row.index
            local encoded = json(row.fields)
            -- Trace changes only; snapshot always records every path/index.
            if mode == "SNAPSHOT" or P.previous[key] ~= encoded then
                emit("ENTITY", {mode = mode, sample = sample, list = name, index = row.index, fields = row.fields})
                P.previous[key] = encoded
            end
        end
    end
    emit("SAMPLE_END", {mode = mode, sample = sample})
    return state
end
local function cursor()
    local ok, root = pcall(function()
        return cco("CcoBattleRoot", "")
    end)

    local cursor_ctx = ok and root and context(root, "CursorContextContext") or nil

    if not cursor_ctx then
        emit("CURSOR", {
            status = "INCONCLUSIVE",
            reason = "BATTLE_CURSOR_CONTEXT_UNAVAILABLE"
        })
        return
    end

    local e = context(cursor_ctx, "EntityContext")

    if not e then
        emit("CURSOR", {
            status = "INCONCLUSIVE",
            reason = "NO_ENTITY_UNDER_CURSOR",
            cursor = {
                HasIntersections = query(cursor_ctx, "HasIntersections"),
                IsContextSelectable = query(cursor_ctx, "IsContextSelectable"),
                CurrentCursorKey = query(cursor_ctx, "CurrentCursorKey")
            }
        })
        return
    end

    local f = entity(e, true)
    f["UnitContext.UnitRecordContext.Key"] =
        query(e, "UnitContext.UnitRecordContext.Key")
    f["UnitContext.UnitRecordContext.UnitLandRecordContext.Key"] =
        query(e, "UnitContext.UnitRecordContext.UnitLandRecordContext.Key")

    emit("CURSOR", {
        fields = f,
        status = "OBSERVED"
    })
end
local function stop(reason)
    P.generation = (P.generation or 0) + 1
    pcall(function() bm:remove_real_callback(timer_name) end)
    if P.tracing then emit("TRACE_END", {reason = reason, samples = P.sample}) end
    P.tracing = false
end
P.stop = stop
P.trace = function()
    stop("REPLACED_BY_NEW_TRACE")
    local unit = selected()
    if not unit then emit("ERROR", {reason = "NO_SELECTED_PLAYER_UNIT"}); return end
    P.serial = P.serial + 1; P.runId = "trace-" .. P.serial
    P.previous = {}; P.sample = 0; P.tracing = true
    local generation = P.generation
    emit("TRACE_START", {durationMs = 5000, intervalMs = 100, timestampClock = "BATTLE_MODEL_MS", callbackClock = "REAL_TIMER_MS",
        simultaneousSources = "INCONCLUSIVE", entityIndexContinuity = "UNVERIFIED"})
    capture(unit, "TRACE", 0)
    local ok, err = pcall(function()
        bm:repeat_real_callback(function()
            if generation ~= P.generation then return end
            local success, failure = pcall(function()
                P.sample = P.sample + 1
                capture(unit, "TRACE", P.sample)
                if P.sample >= 50 then stop("NOMINAL_5_SECONDS_COMPLETE") end
            end)
            if not success then emit("ERROR", {reason = "TRACE_CALLBACK_FAILED", error = tostring(failure)}); stop("ERROR") end
        end, 100, timer_name)
    end)
    if not ok then emit("ERROR", {reason = "REAL_TIMER_UNSUPPORTED", error = tostring(err)}); stop("ERROR") end
end
-- Replace only our listener and timer. The mod's F9 listener remains intact.
stop("HOT_RELOAD")
pcall(function() core:remove_listener(listener_name) end)
local ok, err = pcall(function()
    core:add_listener(listener_name, "ShortcutTriggered", function(event) return event.string == "camera_bookmark_view1" end,
        function() P.trace() end, true)
end)
P.serial = P.serial + 1; P.runId = "snapshot-" .. P.serial; P.previous = {}
emit("SNAPSHOT_START", {f10Installed = ok, listenerError = not ok and tostring(err) or nil})
local unit = selected()
if unit then capture(unit, "SNAPSHOT", 0) else emit("ERROR", {reason = "NO_SELECTED_PLAYER_UNIT"}) end
cursor()
emit("SNAPSHOT_END", {})

