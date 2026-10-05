        -- Canonical values come only from the observed parent-details scalar path.
        -- Keep previous lookup diagnostics; context materialization is not required.
        u.directLookup = u.stats
        u.stats = {}
        u.statExtraction = {status = "COMPLETE", source = "PARENT_DETAILS_STAT_LIST", errors = array()}
        local seen = {}
        local function reject(reason)
            u.statExtraction.status = "UNAVAILABLE"
            u.statExtraction.errors[#u.statExtraction.errors + 1] = reason
        end
        local size = u.statScan.size
        if size.status ~= "VALUE" or type(size.value) ~= "number" or size.value < 0 or size.value > 128 or size.value % 1 ~= 0 or #u.statItems.rows ~= size.value then
            reject("Stat list size unavailable/invalid/incomplete")
        else
            for _, row in ipairs(u.statItems.rows) do
                local key, value = row.viaDetails.Key, row.viaDetails.Value
                if key.status ~= "VALUE" or type(key.value) ~= "string" or key.value == "" then
                    reject("Observed parent stat key unavailable")
                elseif seen[key.value] then
                    reject("Duplicate observed stat key: " .. key.value)
                else
                    seen[key.value] = true
                    if value.status ~= "VALUE" or type(value.value) ~= "number" then
                        reject("Observed parent stat value unavailable: " .. key.value)
                    elseif stats[key.value] then
                        u.stats[key.value] = {Key = key, Value = value, index = row.index,
                            source = "PARENT_DETAILS_STAT_LIST", keyQuery = row.keyQuery, query = row.valueQuery}
                    end
                end
            end
        end
        for key in pairs(stats) do
            if u.stats[key] == nil then reject("Missing required exact stat key: " .. key) end
        end
        u.statStatus = u.statExtraction.status
