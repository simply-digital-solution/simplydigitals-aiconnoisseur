# language: en
Feature: User Authentication
  As an API consumer
  I want to register and authenticate using JWT tokens
  So that I can securely access protected ML resources

  Background:
    Given the API is running

  Scenario: Successful user registration
    When I register with email "alice@example.com" and password "Secure123!"
    Then the response status is 201
    And the response contains field "email" with value "alice@example.com"
    And the response does not contain field "hashed_password"

  Scenario: Duplicate email registration is rejected
    Given a user exists with email "bob@example.com" and password "Secure123!"
    When I register with email "bob@example.com" and password "Secure123!"
    Then the response status is 409

  Scenario: Successful login returns JWT tokens
    Given a user exists with email "carol@example.com" and password "Secure123!"
    When I login with email "carol@example.com" and password "Secure123!"
    Then the response status is 200
    And the response contains field "access_token"
    And the response contains field "refresh_token"
    And the response field "token_type" equals "bearer"

  Scenario: Login with wrong password is rejected
    Given a user exists with email "dave@example.com" and password "Secure123!"
    When I login with email "dave@example.com" and password "WrongPass!"
    Then the response status is 401

  Scenario: Token refresh returns new access token
    Given a user exists with email "eve@example.com" and password "Secure123!"
    And I am logged in as "eve@example.com" with password "Secure123!"
    When I refresh my token
    Then the response status is 200
    And the response contains field "access_token"

  Scenario: Accessing protected endpoint without token is rejected
    When I GET "/api/v1/models/" without authentication
    Then the response status is 403
