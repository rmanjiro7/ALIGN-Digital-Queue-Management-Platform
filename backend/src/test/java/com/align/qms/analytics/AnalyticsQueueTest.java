package com.align.qms.analytics;

import com.align.qms.analytics.dto.QueueAnalyticsResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class AnalyticsQueueTest extends BaseAnalyticsIntegrationTest {

    @Test
    void queue_correctTotalsAndAverages() {
        setAuth(orgId1, "ORG_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.DAYS);
        Instant end = baseTime.plus(1, ChronoUnit.DAYS);

        List<QueueAnalyticsResponse> queues = analyticsService.getQueues(null, null, null, start, end);
        assertThat(queues).hasSize(1);

        QueueAnalyticsResponse q = queues.get(0);
        assertThat(q.queueId()).isEqualTo(queue1Loc1);
        assertThat(q.totalTokens()).isEqualTo(9L);
        assertThat(q.completed()).isEqualTo(3L);
        assertThat(q.noShow()).isEqualTo(1L);
        assertThat(q.cancelled()).isEqualTo(1L);
        
        // Ensure not null
        assertThat(q.avgWaitTimeSeconds()).isNotNull();
        assertThat(q.avgServiceTimeSeconds()).isNotNull();
        assertThat(q.noShowRate()).isNotNull();
        assertThat(q.cancellationRate()).isNotNull();
    }
}
