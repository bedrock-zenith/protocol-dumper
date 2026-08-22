<!--handwritten, don't blame for typos :) -->

- UpdateClientOptionsPacketPayload.json["Filter Profanity Change"] Boolean with Enum-as-Value
- RemoveVolumeEntityPacketPayload.json["Entity Network Id"] Compression on top of struct, or wrapper object, might be reasonable, but i decide to log it here as well
- PlayerDied.json["Died in Raid?"] Compression for boolean doesn't make much of sense
- Resource_Pack_Client_Response_-_Downloading.json["Downloading Packs"] array doesn't have "maxItems" field but "maxProperties", maybe its valid, but should have runtime constrain description to help understanding such a decision
- Item_Descriptor.json["$ref"] Self periodic reference, not sure what it supposed to mean or how it supposed to be serialized
- Data_Store_Change.json["The New Property Value"] its hard to determinate if the field is supposed to be CompoundTag or any different type, at least description works here, but it would be great if we could get build in types for NBTCompounds vs DynamicValue Of DDUI

- Some fields are missing cereals type linkage that means some of integers are supposed to be enum values on its own as far as i know, following fields does have Enum-as-Value encoding for integer, across different files

   ```
       "Container Id",
       "M Stop Expression Version",
       "Container Type",
       "Input Data",
       "Player Permission Level",
       "Hud Element",
   ```

- for CameraAimAssistCategoryPriorities.json there are is some kind of hash-map fields that are not consistent and doesn't align with binary serialization layout, specifically ["entity_type_families", "block_tags"], after some further investigation, i realized it might be simplified case where key fallback is string? but hard to tell
