-- Campaign F9 adapter for exactly two Bretonnia rank experiments.
-- Serializer/error cells follow the existing battle probe; no game mutations.
local C = assert(WV_SKILL_RANK_CONFIG, "Use cli.mjs prepare")
WV_SKILL_RANK_PROBE = WV_SKILL_RANK_PROBE or {serial = 0, anchor = {}}
local P = WV_SKILL_RANK_PROBE
P.serial = P.serial + 1
if not P.token then
    local ok, clock = pcall(function() return tostring(os.time()) .. ":" .. tostring(os.clock()) end)
    P.token = tostring(P.anchor) .. ":" .. (ok and clock or "UNAVAILABLE")
end
local function array(t) return setmetatable(t or {}, {__json_array = true}) end
local function invalid(v) return v ~= v or v == math.huge or v == -math.huge end
local function json(v)
    local t = type(v)
    if t == "nil" then return "null" end
    if t == "boolean" then return v and "true" or "false" end
    if t == "number" then return invalid(v) and "null" or tostring(v) end
    if t == "string" then
        return '"' .. v:gsub('[%z\1-\31\\"]', function(ch)
            if ch == '"' then return '\\"' end
            if ch == '\\' then return '\\\\' end
            return string.format('\\u%04x', string.byte(ch))
        end) .. '"'
    end
    assert(t == "table", "Unserializable value")
    local parts, keys = {}, {}
    if getmetatable(v) and getmetatable(v).__json_array then
        for i = 1, #v do parts[#parts + 1] = json(v[i]) end
        return '[' .. table.concat(parts, ',') .. ']'
    end
    for k in pairs(v) do keys[#keys + 1] = k end
    table.sort(keys)
    for _, k in ipairs(keys) do parts[#parts + 1] = json(k) .. ':' .. json(v[k]) end
    return '{' .. table.concat(parts, ',') .. '}'
end
local function safe(fn)
    local ok, v = pcall(fn)
    if not ok then return {status = "UNSUPPORTED", error = tostring(v):sub(1, 240)} end
    if v == nil then return {status = "NULL"} end
    local t = type(v)
    if t ~= "string" and t ~= "number" and t ~= "boolean" then return {status = "UNSERIALIZABLE", valueType = t} end
    if t == "number" and invalid(v) then return {status = "INVALID_NUMBER"} end
    return {status = "VALUE", value = v}
end
local function q(ctx, expr) return safe(function() return ctx:Call(expr) end) end
local function context(ctx, expr)
    local ok, v = pcall(function() return ctx:Call(expr) end)
    if ok then return v end
end
local function fields(ctx, mapping)
    local row = {}
    for key, expr in pairs(mapping) do row[key] = q(ctx, expr) end
    return row
end
local function list(ctx, name, limit, collect)
    local n = q(ctx, name .. ".Size")
    local rows = array()
    if n.status ~= "VALUE" or type(n.value) ~= "number" or n.value < 0 or n.value > limit or n.value % 1 ~= 0 then
        return {status = "UNAVAILABLE", size = n, rows = rows}
    end
    for i = 0, n.value - 1 do
        local item = context(ctx, name .. ".At(" .. i .. ")")
        if not item then return {status = "UNAVAILABLE", size = n, rows = rows} end
        local row = collect(item)
        if row then rows[#rows + 1] = row end
    end
    return {status = "COMPLETE", rows = rows}
end
local function keys(ctx, name, expr) return list(ctx, name, 256, function(x) return {Key = q(x, expr or "Key")} end) end
local stats = {stat_morale = true, stat_melee_defence = true, stat_armour = true, stat_melee_attack = true}
local targets = {wh_main_brt_inf_men_at_arms = true, wh_dlc07_brt_inf_foot_squires_0 = true}
local f = {format = "wh3-skill-rank-capture-v1", captureId = C.sessionId .. ":" .. P.token .. ":" .. tostring(P.serial),
    gameVersion = C.gameVersion, snapshotId = C.snapshotId, unitSize = C.unitSize, trialId = C.trialId,
    metadataSource = "INSTALLER_VERSION_AND_DECLARED_SETUP", context = "CAMPAIGN", channel = "CCO_CAMPAIGN_PREBONUS_VALUE",
    synthetic = false, timestamp = safe(function() return os.time() end), status = "UNAVAILABLE"}
local ok, err = pcall(function()
    local root = cco("CcoCampaignRoot", "")
    f.root = fields(root, {CampaignKey = "CampaignKey", TurnNumber = "TurnNumber", IsPlayersTurn = "IsPlayersTurn", IsMultiplayer = "IsMultiplayer", IsLocomotionComplete = "IsLocomotionComplete"})
    local selected = {}
    f.selectionScan = list(root, "CharacterList", 4096, function(x)
        local a, b = q(x, "IsSelected"), q(x, "IsPlayerCharacter")
        assert(a.status == "VALUE" and b.status == "VALUE", "Character selection API unavailable")
        if a.value == true and b.value == true then selected[#selected + 1] = x end
    end)
    assert(f.selectionScan.status == "COMPLETE" and #selected == 1, "Select exactly one player Lord")
    local owner = selected[1]
    f.owner = fields(owner, {CQI = "CQI", Rank = "Rank", CurrentXp = "CurrentXp", AgentSubtypeRecordContextKey = "AgentSubtypeRecordContext.Key", IsPlayerCharacter = "IsPlayerCharacter", HasUncommitedSkills = "HasUncommitedSkills"})
    f.skills = list(owner, "SkillList", 512, function(x) return fields(x, {Key = "Key", Level = "Level", OwnerCQI = "CharacterContext.CQI"}) end)
    f.traits = keys(owner, "TraitsList")
    f.ancillaries = keys(owner, "AncillaryList", "AncillaryRecordContext.Key")
    f.activeBundles = keys(owner, "EffectBundleUnfilteredList") -- supplementary, never semantic proof
    local force = context(owner, "MilitaryForceContext")
    f.force = fields(force, {CQI = "CQI", CommandingCharacterCQI = "CommandingCharacterContext.CQI", IsPreviewingStance = "IsPreviewingStance", StanceKey = "ActiveStanceContext.Key"})
    f.armyRoster = list(force, "UnitList", 40, function(x) return fields(x, {Key = "UniqueUiId", MainKey = "UnitRecordContext.Key"}) end)
    f.units = list(force, "UnitList", 40, function(x)
        local main = q(x, "UnitRecordContext.Key")
        assert(main.status == "VALUE", "Unit identity API unavailable")
        if not targets[main.value] then return nil end
        local u = fields(x, {MainKey = "UnitRecordContext.Key", LandKey = "UnitRecordContext.UnitLandRecordContext.Key", UniqueUiId = "UniqueUiId", ForceCQI = "MilitaryForceContext.CQI", ExperienceLevel = "ExperienceLevel", NumEntities = "NumEntities", HealthValue = "HealthValue"})
        local details = context(x, "UnitDetailsContext.PreBonusUnitDetailsContext")
        local d = fields(details, {DetailsUnitId = "CampaignUnitContext.UniqueUiId", DetailsMainKey = "UnitRecordContext.Key", IsCampaign = "IsCampaign", ExperienceScore = "ExperienceScore"})
        for k, v in pairs(d) do u[k] = v end
        u.stats = {}
        u.statScan = list(details, "StatList", 128, function(s)
            local k = q(s, "Key")
            assert(k.status == "VALUE", "Stat identity API unavailable")
            if stats[k.value] then
                assert(u.stats[k.value] == nil, "Duplicate stat identity")
                u.stats[k.value] = {Key = k, Value = q(s, "Value")}
            end
        end)
        assert(u.statScan.status == "COMPLETE", "Stat list incomplete")
        u.purchasedEffects = keys(x, "PurchasedEffectsList")
        return u
    end)
    f.status = "CAPTURED"
end)
if not ok then f.status = "UNAVAILABLE"; f.error = tostring(err):sub(1, 480) end
out("WH3_SKILL_RANK_PROBE|" .. json(f))
