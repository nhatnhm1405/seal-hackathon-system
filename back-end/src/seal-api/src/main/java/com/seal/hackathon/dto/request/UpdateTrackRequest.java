package com.seal.hackathon.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class UpdateTrackRequest{
    private String name;
    private String description;

    @JsonIgnore
    @Schema(hidden = true)
    public boolean isEmpty(){
        return name == null && description == null;
    }
}