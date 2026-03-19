# language: en
Feature: ML Model Training and Inference
  As a data scientist
  I want to train ML models via the API
  So that I can automate model lifecycle management

  Background:
    Given the API is running
    And I am authenticated as "ml_user@example.com"

  Scenario: Train a classification model
    Given I have uploaded a classification dataset
    When I submit a training request for algorithm "classification"
    Then the response status is 201
    And the response field "status" equals "ready"
    And the response contains field "metrics"
    And the metrics contain "accuracy"

  Scenario: Train a regression model
    Given I have uploaded a regression dataset
    When I submit a training request for algorithm "regression"
    Then the response status is 201
    And the response field "status" equals "ready"
    And the metrics contain "r2"

  Scenario: List my trained models
    Given I have uploaded a classification dataset
    And I have trained a classification model
    When I GET "/api/v1/models/"
    Then the response status is 200
    And the response is a list with at least 1 item

  Scenario: Get model details by ID
    Given I have uploaded a classification dataset
    And I have trained a classification model
    When I GET the model details
    Then the response status is 200
    And the response contains field "algorithm"
    And the response contains field "metrics"

  Scenario: Run inference on a trained model
    Given I have uploaded a classification dataset
    And I have trained a classification model
    When I submit a predict request with valid feature data
    Then the response status is 200
    And the response contains field "predictions"
    And the response field "prediction_count" equals 2

  Scenario: Delete a trained model
    Given I have uploaded a classification dataset
    And I have trained a classification model
    When I DELETE the model
    Then the response status is 200
    And the response field "message" equals "Model deleted successfully"

  Scenario: Training with non-existent dataset returns 404
    When I submit a training request with dataset_id "nonexistent-dataset-id"
    Then the response status is 404
