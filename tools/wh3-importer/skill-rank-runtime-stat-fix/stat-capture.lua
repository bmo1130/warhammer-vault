        -- Keep the same preview-free channel. Never substitute base/tooltip values.
        local function lookup(ctx, expr)
            local success, value = pcall(function() return ctx:Call(expr) end)
            if not success then return nil, {status = "UNSUPPORTED", query = expr, error = tostring(value):sub(1, 240)} end
            if value == nil then return nil, {status = "NULL", query = expr} end
            return value, {status = "CONTEXT", query = expr}
        end
        local details, access = lookup(x, "UnitDetailsContext.PreBonusUnitDetailsContext")
        u.detailsAccess = access
        local d = fields(details, {DetailsUnitId = "CampaignUnitContext.UniqueUiId", DetailsMainKey = "UnitRecordContext.Key", IsCampaign = "IsCampaign", ExperienceScore = "ExperienceScore"})
        for k, v in pairs(d) do u[k] = v end
        -- Size is diagnostic only: the CA signature for StatList needs ExpressionState.
        u.statScan = {status = "DIAGNOSTIC_ONLY", size = q(details, "StatList.Size")}
        -- Enumerate the observed collection without assuming any key aliases.
        -- Both paths are diagnostics; neither replaces the required exact stats.
        u.statItems = {status = "UNAVAILABLE", rows = array(), query = "CcoCampaignUnit.UnitDetailsContext.PreBonusUnitDetailsContext.StatList"}
        local size = u.statScan.size
        if size.status == "VALUE" and type(size.value) == "number" and size.value >= 0 and size.value <= 128 and size.value % 1 == 0 then
            u.statItems.status = "COMPLETE"
            for index = 0, size.value - 1 do
                local expr = "StatList.At(" .. tostring(index) .. ")"
                local item, itemAccess = lookup(details, expr)
                local row = {index = index, access = itemAccess, luaType = type(item), Key = q(item, "Key"), Value = q(item, "Value"),
                    keyQuery = u.statItems.query .. ".At(" .. tostring(index) .. ").Key",
                    valueQuery = u.statItems.query .. ".At(" .. tostring(index) .. ").Value",
                    viaDetails = {Key = q(details, expr .. ".Key"), Value = q(details, expr .. ".Value")}}
                u.statItems.rows[#u.statItems.rows + 1] = row
                if itemAccess.status ~= "CONTEXT" or row.Key.status ~= "VALUE" or type(row.Key.value) ~= "string" or row.Key.value == "" or row.Value.status ~= "VALUE" or type(row.Value.value) ~= "number" then
                    u.statItems.status = "PARTIAL"
                end
            end
        end
        u.stats = {}
        u.statStatus = "COMPLETE"
        for _, key in ipairs({"stat_morale", "stat_melee_defence", "stat_armour", "stat_melee_attack"}) do
            local expr = 'StatContextFromKey("' .. key .. '")'
            local stat, statAccess = lookup(details, expr)
            local row = {Key = q(stat, "Key"), Value = q(stat, "Value"), access = statAccess,
                query = "CcoCampaignUnit.UnitDetailsContext.PreBonusUnitDetailsContext." .. expr .. ".Value"}
            u.stats[key] = row
            if row.Key.status ~= "VALUE" or row.Key.value ~= key or row.Value.status ~= "VALUE" or type(row.Value.value) ~= "number" then
                u.statStatus = "UNAVAILABLE"
            end
        end
