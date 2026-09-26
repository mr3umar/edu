

# Design Rules:
Material 3 design principles with shadcn/ui + Radix + Tailwind**. a clean, premium, friendly interface with:

* Rounded corners and subtle elevation
* Generous whitespace
* Clear visual hierarchy
* One primary accent color
* Minimal, tasteful motion
* Modern typography
* Accessible contrast and touch targets

The main experience is a **textbook reader + AI tutor**, with the textbook as the primary content area and a fixed AI tutor panel beside it.
Support **Arabic RTL and English LTR** properly.
Avoid enterprise-dashboard styling, excessive gradients, glassmorphism, and overly playful visuals.
The result should feel like a **premium, modern AI learning product**, not a generic Material or component-library demo.

# API Specs:
* Check ./src/domain.d.ts for types and check ./src/api folder.
* Each payload of api like this:  {"params": {...}}
* Service Def contains error enum codes. if error happend rersponse will be 500 with json object like { "app": "taj-data", "service": "getItem", "warnings": [], "data": {}, "error": { "code": "NotFound", "description": "No data available" }, "instanceId": "edu-ai" }. Read the error codes and handle them properly.


## User Flow:

- Sign in using Google/Apple/Custom Sign-in. 
Api for custom sign-in: api/signIn
After sign-in regardless the method, user object includes verifiedEmail flag, if not verified, call sendEmailOtp, and navigate user to otp form. OTP is 6 digits then call verifyEmailOtp. User included in the response and data should be saved in local storage.

- SignUp: api/signUp, then route use to verify email as in sign-in step. User included in the response and data should be saved in local storage.

- refreshAccessToken: Called when an api responds with unauthorized status. Call this api to optain new access key. or call this whenever the access key reach the exiry time that is identified after sign-in/refresh response.

- sendResetPassword: User can request reset password, email send to him. reset password page should have form to type his new password. then call resetPassword with the token and new password.

- changeMyPassword: User can change his password from his profile.
- updateMyInfo: User can change his info from his profile
