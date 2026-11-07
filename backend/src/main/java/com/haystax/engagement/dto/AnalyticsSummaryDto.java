package com.haystax.engagement.dto;

import java.time.LocalDate;
import java.util.UUID;

public class AnalyticsSummaryDto {
    private UUID id;
    private UUID listingId;
    private LocalDate from;
    private LocalDate to;
    private long totalInquiries;
    private long totalBookings;
    private double occupancyRate;
    private double estimatedRevenue;
    private Double averageRating;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getListingId() { return listingId; }
    public void setListingId(UUID listingId) { this.listingId = listingId; }

    public LocalDate getFrom() { return from; }
    public void setFrom(LocalDate from) { this.from = from; }

    public LocalDate getTo() { return to; }
    public void setTo(LocalDate to) { this.to = to; }

    public long getTotalInquiries() { return totalInquiries; }
    public void setTotalInquiries(long totalInquiries) { this.totalInquiries = totalInquiries; }

    public long getTotalBookings() { return totalBookings; }
    public void setTotalBookings(long totalBookings) { this.totalBookings = totalBookings; }

    public double getOccupancyRate() { return occupancyRate; }
    public void setOccupancyRate(double occupancyRate) { this.occupancyRate = occupancyRate; }

    public double getEstimatedRevenue() { return estimatedRevenue; }
    public void setEstimatedRevenue(double estimatedRevenue) { this.estimatedRevenue = estimatedRevenue; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }
}

