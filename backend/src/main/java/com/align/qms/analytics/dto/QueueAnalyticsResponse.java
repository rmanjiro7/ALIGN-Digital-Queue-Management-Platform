package com.align.qms.analytics.dto;

import java.util.UUID;

public class QueueAnalyticsResponse {
    private UUID queueId;
    private String queueName;
    private long operationalTokenVolume;
    private long completedTokens;
    private long noShows;
    private long cancellations;
    private long transfers;
    private double completionRate;
    private double noShowRate;
    private double cancellationRate;
    private long currentQueueLoad;

    public QueueAnalyticsResponse() {}

    public UUID getQueueId() { return queueId; }
    public void setQueueId(UUID queueId) { this.queueId = queueId; }
    public String getQueueName() { return queueName; }
    public void setQueueName(String queueName) { this.queueName = queueName; }
    public long getOperationalTokenVolume() { return operationalTokenVolume; }
    public void setOperationalTokenVolume(long operationalTokenVolume) { this.operationalTokenVolume = operationalTokenVolume; }
    public long getCompletedTokens() { return completedTokens; }
    public void setCompletedTokens(long completedTokens) { this.completedTokens = completedTokens; }
    public long getNoShows() { return noShows; }
    public void setNoShows(long noShows) { this.noShows = noShows; }
    public long getCancellations() { return cancellations; }
    public void setCancellations(long cancellations) { this.cancellations = cancellations; }
    public long getTransfers() { return transfers; }
    public void setTransfers(long transfers) { this.transfers = transfers; }
    public double getCompletionRate() { return completionRate; }
    public void setCompletionRate(double completionRate) { this.completionRate = completionRate; }
    public double getNoShowRate() { return noShowRate; }
    public void setNoShowRate(double noShowRate) { this.noShowRate = noShowRate; }
    public double getCancellationRate() { return cancellationRate; }
    public void setCancellationRate(double cancellationRate) { this.cancellationRate = cancellationRate; }
    public long getCurrentQueueLoad() { return currentQueueLoad; }
    public void setCurrentQueueLoad(long currentQueueLoad) { this.currentQueueLoad = currentQueueLoad; }
}
