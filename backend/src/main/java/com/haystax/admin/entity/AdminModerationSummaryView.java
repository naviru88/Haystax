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

    @Column(name = "pending_listing_count")
    private Integer pendingListingCount;

    @Column(name = "removed_listing_count")
    private Integer removedListingCount;

    @Column(name = "suspended_user_count")
    private Integer suspendedUserCount;

    //getters / setters

    public Integer getSubmittedReportCount() {
        return submittedReportCount;
    }

    public void setSubmittedReportCount(Integer submittedReportCount) {
        this.submittedReportCount = submittedReportCount;
    }

    public Integer getUnderReviewReportCount() {
        return underReviewReportCount;
    }

    public void setUnderReviewReportCount(Integer underReviewReportCount) {
        this.underReviewReportCount = underReviewReportCount;
    }

    public Integer getPendingListingCount() {
        return pendingListingCount;
    }

    public void setPendingListingCount(Integer pendingListingCount) {
        this.pendingListingCount = pendingListingCount;
    }

    public Integer getRemovedListingCount() {
        return removedListingCount;
    }

    public void setRemovedListingCount(Integer removedListingCount) {
        this.removedListingCount = removedListingCount;
    }

    public Integer getSuspendedUserCount() {
        return suspendedUserCount;
    }

    public void setSuspendedUserCount(Integer suspendedUserCount) {
        this.suspendedUserCount = suspendedUserCount;
    }
}
