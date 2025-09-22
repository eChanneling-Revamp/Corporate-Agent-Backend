# eChanneling Corporate Agent Module - Postman Testing Guide

## 📋 Overview

This guide provides comprehensive testing instructions for the eChanneling Corporate Agent Module API using the enhanced Postman collection with complete CRUD operations.

## 🚀 Quick Start

### 1. Import Collections and Environments

1. **Import the Enhanced Collection:**
   - File: `postman-collection-enhanced.json`
   - Contains: Complete CRUD operations with realistic test data

2. **Import Test Environment:**
   - File: `postman-environments/testing.json`
   - Contains: All necessary environment variables and dynamic test data

3. **Import Development Environment:**
   - File: `postman-environments/development.json`
   - Contains: Standard development configuration

### 2. Server Setup

Make sure your server is running:
```bash
node server.js
```

Server should be accessible at: `http://localhost:5000`

## 📁 Collection Structure

### 🏥 Health & Info
- **Health Check** - Test server connectivity and database status
- **API Info** - Get comprehensive API endpoint information

### 🔐 Authentication - Complete CRUD
- **Register New Agent** - Full registration with realistic business data
- **Login Agent (Standard)** - Basic login flow
- **Login Agent (Remember Me)** - Extended session login
- **Login Agent (Invalid)** - Error handling test

### 👤 User Profile Management - CRUD
- **Get My Profile** - Read current agent profile
- **Update Profile** - Partial profile updates
- **Get Agents List** - Paginated agent listing with sorting
- **Search Agents** - Advanced search with multiple filters

### 📊 Reports & Analytics - CRUD
- **Dashboard Overview** - Real-time statistics
- **Appointments Report** - Date range reporting with dynamic dates
- **Revenue Report** - Monthly revenue with commission breakdown

### 🔧 Error Handling & Edge Cases
- **Unauthorized Request** - Authentication error testing
- **Invalid Endpoint** - 404 error handling
- **Invalid JSON** - Malformed request testing

## 🎯 Testing Scenarios

### Scenario 1: Complete Registration & Login Flow

1. Run **Register New Agent** 
   - Automatically generates unique test data
   - Creates realistic business profile
   - Tests validation and error handling

2. Run **Login Agent (Standard)**
   - Uses generated test credentials
   - Automatically stores authentication tokens

3. Run **Get My Profile**
   - Verifies successful authentication
   - Tests profile data retrieval

### Scenario 2: Profile Management

1. **Get My Profile** - Read current data
2. **Update Profile** - Modify contact information
3. **Get My Profile** - Verify changes were saved

### Scenario 3: Reporting & Analytics

1. **Dashboard Overview** - Get current statistics
2. **Appointments Report** - Test with date range filters
3. **Revenue Report** - Monthly revenue analysis

### Scenario 4: Error Handling

1. **Unauthorized Request** - Test without authentication
2. **Invalid Endpoint** - Test 404 handling
3. **Invalid JSON** - Test malformed request handling

## 🔧 Dynamic Test Data

The collection automatically generates realistic test data:

- **Company Names:** `Test Healthcare 123`, `Medical Solutions 456`
- **Email Addresses:** `test.agent.1695123456@healthcare123.com`
- **Phone Numbers:** `+94771234567`
- **Business Registration:** `BRN123456789`
- **Date Ranges:** Automatically calculated for current/previous months

## 📊 Automated Testing Features

### Pre-Request Scripts
- Generate unique test data for each run
- Set dynamic date ranges for reports
- Log request information for debugging

### Test Assertions
- Validate response status codes
- Check response structure and required fields
- Verify data types and formats
- Test pagination and filtering
- Validate error messages and codes

### Token Management
- Automatically store authentication tokens
- Handle token refresh scenarios
- Clear tokens on logout

## 🚦 Test Results Interpretation

### ✅ Success Indicators
- **200/201 Status Codes** - Successful operations
- **Proper JSON Structure** - Validated response format
- **Token Storage** - Authentication working
- **Dynamic Data** - Unique test data generated

### ⚠️ Expected Behaviors (Current Server State)
- **503 Service Unavailable** - Feature not fully implemented (expected with TypeScript models)
- **Mock Responses** - Server running in test mode with sample data
- **MongoDB Connection** - May show occasional DNS resolution retries

### ❌ Error Scenarios (Intentional)
- **401 Unauthorized** - Authentication tests
- **404 Not Found** - Invalid endpoint tests
- **400 Bad Request** - Malformed data tests

## 📈 Performance Testing

All requests include performance validation:
- Response time under 5 seconds
- Proper content-type headers
- Reasonable payload sizes

## 🔄 Environment Variables

### Dynamic Variables (Auto-Generated)
- `test_company_name` - Unique company name
- `test_email` - Unique email address
- `test_phone` - Random phone number
- `start_date` / `end_date` - Report date ranges

### Static Variables
- `base_url` - Server base URL
- `api_version` - API version (v1)
- `access_token` - Authentication token
- `refresh_token` - Token refresh

## 🎨 Testing Best Practices

### 1. Run Tests in Order
- Start with Health Check
- Run Authentication flow first
- Use authenticated endpoints after login

### 2. Monitor Console Output
- Check for generated test data logs
- Verify token storage messages
- Review error details for debugging

### 3. Environment Selection
- Use **Testing Environment** for comprehensive tests
- Use **Development Environment** for basic API testing

### 4. Data Cleanup
- Each test run generates unique data
- No manual cleanup required
- Fresh data for each test session

## 🐛 Troubleshooting

### Common Issues

1. **Server Not Running**
   - Ensure `node server.js` is running
   - Check server console for startup messages

2. **MongoDB Connection Issues**
   - Server continues with mock responses
   - Check health endpoint for database status

3. **Authentication Failures**
   - Clear stored tokens in environment
   - Re-run registration/login flow

4. **Missing Environment Variables**
   - Ensure correct environment is selected
   - Check variable names match collection requirements

### Debug Tips

1. **Enable Postman Console** - View detailed logs
2. **Check Pre-request Scripts** - Verify data generation
3. **Review Test Results** - Understand validation failures
4. **Monitor Server Console** - Check for backend errors

## 📝 Customization

### Adding New Tests

1. **Duplicate existing requests** for similar endpoints
2. **Update request URLs and payloads** as needed
3. **Add appropriate test assertions** for validation
4. **Include pre-request scripts** for dynamic data

### Modifying Test Data

1. **Edit pre-request scripts** to change data generation
2. **Update environment variables** for static values
3. **Customize assertions** for specific validation needs

## 🎯 Next Steps

1. **Import both collections** (enhanced and original)
2. **Select testing environment**
3. **Start with health check**
4. **Run authentication flow**
5. **Test CRUD operations**
6. **Review test results and logs**

Happy Testing! 🚀