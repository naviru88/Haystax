package com.haystax.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.time.LocalDate;

//Read-only mapping of public.admin_daily_activity.
@Entity
@Immutable
@Table(name = "admin_daily_activity")
public class AdminDailyActivityView {

    @Id
    private LocalDate day;

    private Integer searches;

    @Column(name = "listing_views")
    private Integer listingViews;

    @Column(name = "filters_applied")
    private Integer filtersApplied;

    @Column(name = "recommendation_views")
    private Integer recommendationViews;

    @Column(name = "listing_contacts")
    private Integer listingContacts;

    // getters / setters

    public LocalDate getDay() {
        return day;
    }

    public void setDay(LocalDate day) {
        this.day = day;
    }

    public Integer getSearches() {
        return searches;
    }

    public void setSearches(Integer searches) {
        this.searches = searches;
    }

    public Integer getListingViews() {
        return listingViews;
    }

    public void setListingViews(Integer listingViews) {
        this.listingViews = listingViews;
    }

    public Integer getFiltersApplied() {
        return filtersApplied;
    }

    public void setFiltersApplied(Integer filtersApplied) {
        this.filtersApplied = filtersApplied;
    }

    public Integer getRecommendationViews() {
        return recommendationViews;
    }

    public void setRecommendationViews(Integer recommendationViews) {
        this.recommendationViews = recommendationViews;
    }

    public Integer getListingContacts() {
        return listingContacts;
    }

    public void setListingContacts(Integer listingContacts) {
        this.listingContacts = listingContacts;
    }
}
