package com.align.qms.analytics;

import com.align.qms.analytics.dto.CounterAnalyticsResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class AnalyticsCounterTest extends BaseAnalyticsIntegrationTest {

    @Test
    void counter_correctMetricsAndAvailability() {
        setAuth(orgId1, "ORG_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.DAYS);
        Instant end = baseTime.plus(1, ChronoUnit.DAYS);

        List<CounterAnalyticsResponse> counters = analyticsService.getCounters(null, null, null, start, end);
        assertThat(counters).hasSize(1);

        CounterAnalyticsResponse ctr = counters.get(0);
        assertThat(ctr.counterId()).isEqualTo(counter1Loc1);
        assertThat(ctr.currentAvailability()).isEqualTo("ONLINE");
        assertThat(ctr.tokensCompleted()).isEqualTo(3L);
        assertThat(ctr.avgServiceTimeSeconds()).isNotNull();
    }
}
