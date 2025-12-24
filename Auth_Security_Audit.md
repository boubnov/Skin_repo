# Auth Security Audit & Advanced Test Plan
**Role:** Senior Security Engineer, Google Health AI
**Date:** 2025-12-23

The current implementation works for *happy paths*, but it has **Critical Security Weaknesses** that would fail a Google internal security review. Here are the tests you need to implement to fix them.

---

## 1. The "Confused Deputy" Attack (CRITICAL)
**The Weakness:**
Currently, we verify that the Google Token is *valid*, but we don't check **WHO** it was issued for.
*   *Scenario:* An attacker builds a malicious app ("Free Flashlight"). You log in with Google. The attacker gets your valid Google ID Token. The attacker sends *that* token to **your** backend.
*   *Result:* Your backend sees a valid Google signature and logs the attacker into **your** account.

**The Test:**
```python
def test_rejects_token_from_wrong_app():
    # Mock a token that is valid, BUT has 'aud': 'malicious-flashlight-app-id'
    # Expectation: Backend MUST return 401 Unauthorized
```
*Why:* You must enforce that `id_token['aud'] == YOUR_GOOGLE_CLIENT_ID`.

---

## 2. Token Replay & Expiration
**The Weakness:**
Google ID tokens expire after ~1 hour. If we don't check the `exp` claim, an attacker who stole a token log from 2 years ago could still use it today.

**The Test:**
```python
def test_rejects_expired_google_token():
    # Mock a token where 'exp' is timestamped in the past
    # Expectation: Backend MUST return 401 Token Expired
```
*Why:* Prevents usage of stolen, old credentials.

---

## 3. Provider Mismatch (Spoofing)
**The Weakness:**
The User Model has `social_provider` and `social_id`. An attacker might try to send a Google Token but claim it's an "Apple" login to confuse your logic or bypass Apple-specific checks.

**The Test:**
```python
def test_enforces_provider_match():
    # Send a valid Google Token, but set request param provider="apple"
    # Expectation: 400 Bad Request ("Token issuer google.com does not match provider apple")
```
*Why:* Ensures data integrity and prevents logic bypasses.

---

## 4. Race Condition (Double Registration)
**The Weakness:**
If a user has a slow internet connection and clicks "Sign In" twice rapidly, your backend might try to create the user twice simultaneously.
*   *Risk:* Database corruption or "500 Internal Server Error" crash for the user.

**The Test:**
```python
def test_concurrent_registration_handling():
    # Fire 2 requests with the SAME new user token at the EXACT same millisecond
    # Expectation: One succeeds (200), One returns "User already exists" (200 OK - idempotent)
```
*Why:* High reliability standard. The user shouldn't see an error just because they double-clicked.

---

## 5. PI Injection (The "Little Bobby Tables")
**The Weakness:**
What if a user's name on Google is `Robert'); DROP TABLE Users;`? While strictly less risky with ORMs, we must ensure sanitization.

**The Test:**
```python
def test_handles_special_chars_in_profile_data():
    # Mock Google Token with name="<script>alert('xss')</script>"
    # Expectation: User is created safely, data is stored as literal string
```
*Why:* Prevents localized crashes or weird UI bugs in the mobile app later.
