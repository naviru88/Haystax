package com.haystax.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

//Read-only mapping of public.admin_moderation_summary.
@Entity
@Immutable
@Table(name = "admin_moderation_summary")
public class AdminModerationSummaryView {

    @Id
    @Column(name = "submitted_report_count")
    private Integer submittedReportCount;

    @Column(name = "under_review_report_count")
    private Integer underReviewReportCount;

    @Column(name = "resolved_report_count")
    private Integer resolvedReportCount;

    @Column(name = "rejected_report_count")
    private Integer rejectedReportCount;

    @Column(name = "pending_listing_count")
    private Integer pendingListingCount;

    @Column(name = "removed_listing_count")
    private Integer removedListingCount;

    @Column(name = "published_listing_count")
    private Integer publishedListingCount;

    @Column(name = "active_tenancy_count")
    private Integer activeTenancyCount;

    @Column(name = "total_user_count")
    private Integer totalUserCount;

    @Column(name = "suspended_user_count")
    private Integer suspendedUserCount;

    // getters / setters
    public Integer getSubmittedReportCount() { return submittedReportCount; }
    public void setSubmittedReportCount(Integer v) { this.submittedReportCount = v; }

    public Integer getUnderReviewReportCount() { return underReviewReportCount; }
    public void setUnderReviewReportCount(Integer v) { this.underReviewReportCount = v; }

    public Integer getResolvedReportCount() { return resolvedReportCount; }
    public void setResolvedReportCount(Integer v) { this.resolvedReportCount = v; }

    public Integer getRejectedReportCount() { return rejectedReportCount; }
    public void setRejectedReportCount(Integer v) { this.rejectedReportCount = v; }

    public Integer getPendingListingCount() { return pendingListingCount; }
    public void setPendingListingCount(Integer v) { this.pendingListingCount = v; }

    public Integer getRemovedListingCount() { return removedListingCount; }
    public void setRemovedListingCount(Integer v) { this.removedListingCount = v; }

    public Integer getPublishedListingCount() { return publishedListingCount; }
    public void setPublishedListingCount(Integer v) { this.publishedListingCount = v; }

    public Integer getActiveTenancyCount() { return activeTenancyCount; }
    public void setActiveTenancyCount(Integer v) { this.activeTenancyCount = v; }

    public Integer getTotalUserCount() { return totalUserCount; }
    public void setTotalUserCount(Integer v) { this.totalUserCount = v; }

    public Integer getSuspendedUserCount() { return suspendedUserCount; }
    public void setSuspendedUserCount(Integer v) { this.suspendedUserCount = v; }
}
