package com.align.qms.analytics;

import com.align.qms.analytics.dto.AnalyticsTrafficResponse;
import com.align.qms.analytics.dto.HourlyBucket;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class AnalyticsTrafficTest extends BaseAnalyticsIntegrationTest {

    @Test
    void traffic_returnsExactly24Hours() {
        setAuth(orgId1, "ORG_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.DAYS);
        Instant end = baseTime.plus(1, ChronoUnit.DAYS);

        AnalyticsTrafficResponse res = analyticsService.getTraffic(null, null, start, end);

        assertThat(res.hourlyBuckets()).hasSize(24);
        
        for (int i = 0; i < 24; i++) {
            assertThat(res.hourlyBuckets().get(i).hour()).isEqualTo(i);
            assertThat(res.hourlyBuckets().get(i).tokensJoined()).isNotNull();
            assertThat(res.hourlyBuckets().get(i).tokensCompleted()).isNotNull();
        }
    }
}
