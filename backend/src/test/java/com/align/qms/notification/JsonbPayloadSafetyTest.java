package com.align.qms.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

public class JsonbPayloadSafetyTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    public void testPayloadSerialization() throws Exception {
        // Normal text
        String normal = "This is a normal message";
        String normalJson = objectMapper.writeValueAsString(Map.of("message", normal));
        assertEquals("{\"message\":\"This is a normal message\"}", normalJson);

        // Double quotes
        String withQuotes = "This has \"quotes\" inside";
        String quotesJson = objectMapper.writeValueAsString(Map.of("message", withQuotes));
        assertEquals("{\"message\":\"This has \\\"quotes\\\" inside\"}", quotesJson);

        // Newlines
        String withNewlines = "Line 1\nLine 2";
        String newlinesJson = objectMapper.writeValueAsString(Map.of("message", withNewlines));
        assertEquals("{\"message\":\"Line 1\\nLine 2\"}", newlinesJson);

        // Backslashes
        String withBackslashes = "Path C:\\test\\file";
        String backslashesJson = objectMapper.writeValueAsString(Map.of("message", withBackslashes));
        assertEquals("{\"message\":\"Path C:\\\\test\\\\file\"}", backslashesJson);
        
        // Ensure Jackson can parse it back
        Map<String, String> parsed = objectMapper.readValue(backslashesJson, Map.class);
        assertEquals(withBackslashes, parsed.get("message"));
    }
}
