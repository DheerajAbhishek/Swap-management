/**
 * Test Script for Staff Scoring System
 * 
 * This script tests the Lambda function by making sample requests
 * Can be run locally or against deployed API
 */

const https = require('https');

// Configuration
const API_URL = 'YOUR_API_ID.execute-api.ap-south-1.amazonaws.com';
const API_STAGE = 'prod';

// Helper function to make API requests
function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_URL,
            port: 443,
            path: `/${API_STAGE}${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            const bodyString = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        body: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        body: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

// Test functions
async function test1_CreateScore() {
    console.log('\n=== Test 1: Create Staff Score ===');

    const result = await makeRequest('/staff/score', 'POST', {
        staff_id: 'TEST001',
        staff_name: 'John Doe',
        attendance_score: 8.5,
        hygiene_score: 9.0,
        discipline_score: 7.5,
        notes: 'Test score entry'
    });

    console.log('Status:', result.statusCode);
    console.log('Response:', JSON.stringify(result.body, null, 2));

    if (result.body.success) {
        console.log('✓ Test 1 PASSED');
        return true;
    } else {
        console.log('✗ Test 1 FAILED');
        return false;
    }
}

async function test2_GetCurrentScore() {
    console.log('\n=== Test 2: Get Current Month Score ===');

    const result = await makeRequest('/staff/TEST001/score/current', 'GET');

    console.log('Status:', result.statusCode);
    console.log('Response:', JSON.stringify(result.body, null, 2));

    if (result.body.success && result.body.data) {
        console.log('✓ Test 2 PASSED');
        console.log(`  - Total Score: ${result.body.data.total_score}`);
        console.log(`  - Normalized Score: ${result.body.data.normalized_score}`);
        return true;
    } else {
        console.log('✗ Test 2 FAILED');
        return false;
    }
}

async function test3_UpdateScore() {
    console.log('\n=== Test 3: Update Existing Score ===');

    const result = await makeRequest('/staff/score', 'POST', {
        staff_id: 'TEST001',
        staff_name: 'John Doe',
        attendance_score: 9.0,
        hygiene_score: 9.5,
        discipline_score: 8.5,
        notes: 'Updated test score'
    });

    console.log('Status:', result.statusCode);
    console.log('Response:', JSON.stringify(result.body, null, 2));

    if (result.body.success) {
        console.log('✓ Test 3 PASSED');
        console.log(`  - New Total Score: ${result.body.data.total_score}`);
        return true;
    } else {
        console.log('✗ Test 3 FAILED');
        return false;
    }
}

async function test4_GetHistory() {
    console.log('\n=== Test 4: Get Score History ===');

    const result = await makeRequest('/staff/TEST001/score/history?limit=12', 'GET');

    console.log('Status:', result.statusCode);
    console.log('Response:', JSON.stringify(result.body, null, 2));

    if (result.body.success) {
        console.log('✓ Test 4 PASSED');
        console.log(`  - Records Found: ${result.body.count}`);
        return true;
    } else {
        console.log('✗ Test 4 FAILED');
        return false;
    }
}

async function test5_CreateMultipleStaff() {
    console.log('\n=== Test 5: Create Multiple Staff Scores ===');

    const staffData = [
        { staff_id: 'TEST002', staff_name: 'Jane Smith', scores: [9.0, 8.5, 9.0] },
        { staff_id: 'TEST003', staff_name: 'Bob Johnson', scores: [7.5, 8.0, 7.0] },
        { staff_id: 'TEST004', staff_name: 'Alice Brown', scores: [9.5, 9.0, 9.5] }
    ];

    let allPassed = true;

    for (const staff of staffData) {
        const result = await makeRequest('/staff/score', 'POST', {
            staff_id: staff.staff_id,
            staff_name: staff.staff_name,
            attendance_score: staff.scores[0],
            hygiene_score: staff.scores[1],
            discipline_score: staff.scores[2]
        });

        if (!result.body.success) {
            console.log(`  ✗ Failed to create score for ${staff.staff_name}`);
            allPassed = false;
        } else {
            console.log(`  ✓ Created score for ${staff.staff_name} - Total: ${result.body.data.total_score}`);
        }
    }

    if (allPassed) {
        console.log('✓ Test 5 PASSED');
    } else {
        console.log('✗ Test 5 FAILED');
    }

    return allPassed;
}

async function test6_GetLeaderboard() {
    console.log('\n=== Test 6: Get Monthly Leaderboard ===');

    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = await makeRequest(`/staff/scores/leaderboard?month_year=${monthYear}&limit=10`, 'GET');

    console.log('Status:', result.statusCode);
    console.log('Response:', JSON.stringify(result.body, null, 2));

    if (result.body.success) {
        console.log('✓ Test 6 PASSED');
        console.log(`  - Staff in Leaderboard: ${result.body.count}`);

        if (result.body.data && result.body.data.length > 0) {
            console.log('\n  Top 3:');
            result.body.data.slice(0, 3).forEach(staff => {
                console.log(`    ${staff.rank}. ${staff.staff_name} - ${staff.normalized_score}/10`);
            });
        }

        return true;
    } else {
        console.log('✗ Test 6 FAILED');
        return false;
    }
}

async function test7_ValidationTests() {
    console.log('\n=== Test 7: Validation Tests ===');

    let allPassed = true;

    // Test 7a: Missing staff_id
    console.log('\n  Test 7a: Missing staff_id');
    const result1 = await makeRequest('/staff/score', 'POST', {
        staff_name: 'Test User',
        attendance_score: 8.0,
        hygiene_score: 9.0,
        discipline_score: 7.5
    });

    if (result1.body.success === false && result1.body.error) {
        console.log('  ✓ Correctly rejected missing staff_id');
    } else {
        console.log('  ✗ Failed to reject missing staff_id');
        allPassed = false;
    }

    // Test 7b: Invalid score (> 10)
    console.log('\n  Test 7b: Invalid score value (> 10)');
    const result2 = await makeRequest('/staff/score', 'POST', {
        staff_id: 'TEST999',
        staff_name: 'Test User',
        attendance_score: 15.0,
        hygiene_score: 9.0,
        discipline_score: 7.5
    });

    if (result2.body.success === false && result2.body.error) {
        console.log('  ✓ Correctly rejected invalid score');
    } else {
        console.log('  ✗ Failed to reject invalid score');
        allPassed = false;
    }

    // Test 7c: Invalid score (< 0)
    console.log('\n  Test 7c: Invalid score value (< 0)');
    const result3 = await makeRequest('/staff/score', 'POST', {
        staff_id: 'TEST999',
        staff_name: 'Test User',
        attendance_score: -5.0,
        hygiene_score: 9.0,
        discipline_score: 7.5
    });

    if (result3.body.success === false && result3.body.error) {
        console.log('  ✓ Correctly rejected negative score');
    } else {
        console.log('  ✗ Failed to reject negative score');
        allPassed = false;
    }

    if (allPassed) {
        console.log('\n✓ Test 7 PASSED');
    } else {
        console.log('\n✗ Test 7 FAILED');
    }

    return allPassed;
}

// Main test runner
async function runAllTests() {
    console.log('========================================');
    console.log('  Staff Scoring System - Test Suite');
    console.log('========================================');
    console.log(`API URL: https://${API_URL}/${API_STAGE}`);

    if (API_URL === 'YOUR_API_ID.execute-api.ap-south-1.amazonaws.com') {
        console.log('\n⚠️  WARNING: Please update the API_URL in this script');
        console.log('   Replace YOUR_API_ID with your actual API Gateway ID\n');
        return;
    }

    const results = {
        passed: 0,
        failed: 0,
        total: 0
    };

    try {
        const tests = [
            { name: 'Create Score', fn: test1_CreateScore },
            { name: 'Get Current Score', fn: test2_GetCurrentScore },
            { name: 'Update Score', fn: test3_UpdateScore },
            { name: 'Get History', fn: test4_GetHistory },
            { name: 'Create Multiple', fn: test5_CreateMultipleStaff },
            { name: 'Get Leaderboard', fn: test6_GetLeaderboard },
            { name: 'Validation Tests', fn: test7_ValidationTests }
        ];

        for (const test of tests) {
            results.total++;
            try {
                const passed = await test.fn();
                if (passed) {
                    results.passed++;
                } else {
                    results.failed++;
                }
            } catch (error) {
                console.log(`✗ ${test.name} FAILED with error:`, error.message);
                results.failed++;
            }

            // Delay between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Summary
        console.log('\n========================================');
        console.log('  Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${results.total}`);
        console.log(`Passed: ${results.passed} ✓`);
        console.log(`Failed: ${results.failed} ✗`);
        console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
        console.log('========================================\n');

        if (results.failed === 0) {
            console.log('🎉 All tests passed! Your staff scoring system is working correctly.\n');
        } else {
            console.log('⚠️  Some tests failed. Please check the logs above for details.\n');
        }

    } catch (error) {
        console.error('\n❌ Test suite failed with error:', error);
    }
}

// Run tests if executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests, makeRequest };
