# language: en
Feature: Data Analytics
  As an analyst
  I want to run statistical analyses on uploaded datasets
  So that I can explore data before building models

  Background:
    Given the API is running
    And I am authenticated as "analyst@example.com"
    And I have uploaded a numeric dataset

  Scenario: Get descriptive statistics
    When I POST to "/api/v1/analytics/describe" with my dataset id
    Then the response status is 200
    And the response contains descriptive stats keys

  Scenario: Get correlation matrix
    When I POST to "/api/v1/analytics/correlation" with my dataset id
    Then the response status is 200
    And the response contains field "correlation_matrix"

  Scenario: Forecast future values
    Given I have uploaded a time-series dataset
    When I POST a forecast request for 7 periods
    Then the response status is 200
    And the response field "periods" equals 7
    And the forecast list has 7 entries

  Scenario: Analytics on non-existent dataset returns 404
    When I POST to "/api/v1/analytics/describe" with dataset id "bad-id"
    Then the response status is 404
