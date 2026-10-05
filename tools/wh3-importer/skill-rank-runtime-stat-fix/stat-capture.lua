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
