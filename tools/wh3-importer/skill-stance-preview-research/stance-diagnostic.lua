    -- Read-only scalar routes; compare exact CQI before interpreting any flag.
    local mapping = {CQI = "CQI", CommandingCharacterCQI = "CommandingCharacterContext.CQI",
        IsSelected = "IsSelected", IsPreviewingStance = "IsPreviewingStance",
        StanceKey = "ActiveStanceContext.Key", StancePreviewPercentCost = "StancePreviewPercentCost",
        CanSwitchToPreviewStance = "CanSwitchToPreviewStance"}
    local function route(ctx, prefix, label)
        local cells, queries = {}, {}
        for key, expr in pairs(mapping) do
            cells[key] = q(ctx, prefix .. expr); queries[key] = prefix .. expr
        end
        return {source = label, queries = queries, cells = cells}
    end
    local diag = {owner = fields(owner, {IsSelected = "IsSelected", IsDetailsOnly = "IsDetailsOnly",
        IsOnMap = "IsOnMap", IsPreviewingMove = "IsPreviewingMove", ActionPointPercent = "ActionPointPercent",
        ActionPointPreviewPercent = "ActionPointPreviewPercent"}), routes = array()}
    f.stanceDiagnostic = diag
    diag.routes[#diag.routes + 1] = route(force, "", "MATERIALIZED_OWNER_FORCE")
    diag.routes[#diag.routes + 1] = route(owner, "MilitaryForceContext.", "PARENT_OWNER_FORCE")
    -- Repeat the original flag after parent evaluation to detect a within-F9 change.
    diag.originalFlagBefore = f.force.IsPreviewingStance
    diag.originalFlagAfter = q(force, "IsPreviewingStance")
    diag.unitRoutes = list(force, "UnitList", 40, function(x)
        local main = q(x, "UnitRecordContext.Key")
        if main.status ~= "VALUE" or not targets[main.value] then return nil end
        local row = route(x, "MilitaryForceContext.", "PARENT_UNIT_FORCE")
        row.MainKey = main; row.UniqueUiId = q(x, "UniqueUiId")
        return row
    end)
    -- Independent campaign model. No stance activation, preview mutator, or Skill API.
    local model = {source = "cm:get_military_force_by_cqi", queryCQI = C.forceCQI}
    diag.model = model
    local modelOk, modelForce = pcall(function() return cm:get_military_force_by_cqi(C.forceCQI) end)
    if not modelOk then model.access = {status = "UNSUPPORTED", error = tostring(modelForce):sub(1,240)}
    elseif modelForce == nil or modelForce == false then model.access = {status = "NULL"}
    else
        model.access = {status = "CONTEXT"}
        model.IsNull = safe(function() return modelForce:is_null_interface() end)
        model.CQI = safe(function() return modelForce:command_queue_index() end)
        model.StanceKey = safe(function() return modelForce:active_stance() end)
        model.CommandingCharacterCQI = safe(function() return modelForce:general_character():command_queue_index() end)
        model.ActionPointsRemainingPercent = safe(function() return modelForce:general_character():action_points_remaining_percent() end)
        model.queries = {IsNull = "is_null_interface()", CQI = "command_queue_index()", StanceKey = "active_stance()",
            CommandingCharacterCQI = "general_character():command_queue_index()",
            ActionPointsRemainingPercent = "general_character():action_points_remaining_percent()"}
    end
