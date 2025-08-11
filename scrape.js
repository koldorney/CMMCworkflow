const { chromium } = require('playwright');

async function collectDODAwardees() {
    const browser = await chromium.launch({
        headless: true, // Set to true for production
        //slowMo: 50 // Remove for production
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Set a longer timeout for SAM.gov which can be slow
    page.setDefaultTimeout(8000);

    // All 50 US states with their abbreviations
    const states = [
        { key: 'AL', name: 'Alabama' },
        { key: 'AK', name: 'Alaska' },
        { key: 'AZ', name: 'Arizona' },
        { key: 'AR', name: 'Arkansas' },
        { key: 'CA', name: 'California' },
        { key: 'CO', name: 'Colorado' },
        { key: 'CT', name: 'Connecticut' },
        { key: 'DE', name: 'Delaware' },
        { key: 'FL', name: 'Florida' },
        { key: 'GA', name: 'Georgia' },
        { key: 'HI', name: 'Hawaii' },
        { key: 'ID', name: 'Idaho' },
        { key: 'IL', name: 'Illinois' },
        { key: 'IN', name: 'Indiana' },
        { key: 'IA', name: 'Iowa' },
        { key: 'KS', name: 'Kansas' },
        { key: 'KY', name: 'Kentucky' },
        { key: 'LA', name: 'Louisiana' },
        { key: 'ME', name: 'Maine' },
        { key: 'MD', name: 'Maryland' },
        { key: 'MA', name: 'Massachusetts' },
        { key: 'MI', name: 'Michigan' },
        { key: 'MN', name: 'Minnesota' },
        { key: 'MS', name: 'Mississippi' },
        { key: 'MO', name: 'Missouri' },
        { key: 'MT', name: 'Montana' },
        { key: 'NE', name: 'Nebraska' },
        { key: 'NV', name: 'Nevada' },
        { key: 'NH', name: 'New Hampshire' },
        { key: 'NJ', name: 'New Jersey' },
        { key: 'NM', name: 'New Mexico' },
        { key: 'NY', name: 'New York' },
        { key: 'NC', name: 'North Carolina' },
        { key: 'ND', name: 'North Dakota' },
        { key: 'OH', name: 'Ohio' },
        { key: 'OK', name: 'Oklahoma' },
        { key: 'OR', name: 'Oregon' },
        { key: 'PA', name: 'Pennsylvania' },
        { key: 'RI', name: 'Rhode Island' },
        { key: 'SC', name: 'South Carolina' },
        { key: 'SD', name: 'South Dakota' },
        { key: 'TN', name: 'Tennessee' },
        { key: 'TX', name: 'Texas' },
        { key: 'UT', name: 'Utah' },
        { key: 'VT', name: 'Vermont' },
        { key: 'VA', name: 'Virginia' },
        { key: 'WA', name: 'Washington' },
        { key: 'WV', name: 'West Virginia' },
        { key: 'WI', name: 'Wisconsin' },
        { key: 'WY', name: 'Wyoming' }
    ];

    const allUniqueAwardees = new Set();
    const resultsByState = {};

    console.log(`Starting collection for all ${states.length} states...`);

    for (let i = 0; i < states.length; i++) {
        const state = states[i];

        console.log(`\n========================================`);
        console.log(`Processing ${state.name} (${state.key}) - ${i + 1}/${states.length}`);
        console.log(`========================================`);

        // Build URL for this state
        const url = `https://sam.gov/search/?page=1&pageSize=100&sort=-modifiedDate&index=opp&sfm%5BsimpleSearch%5D%5BkeywordRadio%5D=ALL&sfm%5BsimpleSearch%5D%5BkeywordEditorTextarea%5D=&sfm%5Bstatus%5D%5Bis_active%5D=true&sfm%5Bstatus%5D%5Bis_inactive%5D=true&sfm%5Bdates%5D%5BupdatedDate%5D%5BupdatedDateSelect%5D=pastWeek&sfm%5BserviceClassificationWrapper%5D%5Bnaics%5D%5B0%5D%5Bkey%5D=31-33&sfm%5BserviceClassificationWrapper%5D%5Bnaics%5D%5B0%5D%5Bvalue%5D=31-33%20-%20Manufacturing&sfm%5BawardeeDetails%5D%5Bstate%5D%5B0%5D%5Bkey%5D=${state.key}&sfm%5BawardeeDetails%5D%5Bstate%5D%5B0%5D%5Bvalue%5D=${state.key}%20-%20${encodeURIComponent(state.name)}&sfm%5BagencyPicker%5D%5B0%5D%5BorgKey%5D=100000000&sfm%5BagencyPicker%5D%5B0%5D%5BorgText%5D=097%20-%20DEPT%20OF%20DEFENSE&sfm%5BagencyPicker%5D%5B0%5D%5BlevelText%5D=Dept%20%2F%20Ind.%20Agency&sfm%5BagencyPicker%5D%5B0%5D%5Bhighlighted%5D=true`;

        try {
            console.log(`Navigating to SAM.gov for ${state.name}...`);
            await page.goto(url, { waitUntil: 'networkidle' });

            // Wait for the search results to load (or no results message)
            console.log('Waiting for search results to load...');

            try {
                await page.waitForSelector('app-opportunity-result', { timeout: 5000 });

                // Additional wait to ensure all content is rendered
                await page.waitForTimeout(2000);

                // Wait for results to be visible
                await page.waitForSelector('app-opportunity-result', { state: 'visible' });

                // Extract awardee names from the current page
                const awardees = await page.evaluate(() => {
                    const results = [];

                    // Select all opportunity result cards
                    const cards = document.querySelectorAll('app-opportunity-result');

                    cards.forEach(card => {
                        // Look for the awardee field within each card
                        const awardeeElements = card.querySelectorAll('.sds-field');

                        awardeeElements.forEach(field => {
                            const fieldName = field.querySelector('.sds-field__name');
                            const fieldValue = field.querySelector('.sds-field__value');

                            if (fieldName && fieldValue) {
                                const nameText = fieldName.textContent.trim();
                                if (nameText === 'Awardee') {
                                    const awardeeValue = fieldValue.textContent.trim();
                                    if (awardeeValue) {
                                        results.push(awardeeValue);
                                    }
                                }
                            }
                        });
                    });

                    return results;
                });

                const stateUniqueAwardees = new Set();

                // Add awardees to both state-specific and global sets
                awardees.forEach(awardee => {
                    if (awardee) {
                        stateUniqueAwardees.add(awardee);
                        allUniqueAwardees.add(awardee);
                    }
                });

                const stateAwardeesArray = Array.from(stateUniqueAwardees).sort();
                resultsByState[state.key] = {
                    stateName: state.name,
                    count: stateAwardeesArray.length,
                    awardees: stateAwardeesArray
                };

                console.log(`Found ${awardees.length} total awardees, ${stateUniqueAwardees.size} unique for ${state.name}`);

            } catch (timeoutError) {
                console.log(`No results found for ${state.name} (timeout waiting for results)`);
                resultsByState[state.key] = {
                    stateName: state.name,
                    count: 0,
                    awardees: []
                };
            }

        } catch (error) {
            console.error(`Error processing ${state.name}:`, error.message);
            resultsByState[state.key] = {
                stateName: state.name,
                count: 0,
                awardees: [],
                error: error.message
            };
        }

        // Small delay between states to be respectful to the server
        await page.waitForTimeout(200);
    }

    // Convert global set to sorted array for output
    const sortedAllAwardees = Array.from(allUniqueAwardees).sort();

    console.log('\n========================================');
    console.log('COLLECTION COMPLETE - ALL STATES');
    console.log('========================================');
    console.log(`Total unique DOD contract awardees found across all states: ${sortedAllAwardees.length}`);

    console.log('\nResults by State:');
    console.log('----------------');
    states.forEach(state => {
        const stateResult = resultsByState[state.key];
        console.log(`${state.name}: ${stateResult.count} unique awardees`);
    });

    console.log('\nAll Unique Awardees (alphabetically sorted):');
    console.log('--------------------------------------------');
    sortedAllAwardees.forEach((awardee, index) => {
        console.log(`${index + 1}. ${awardee}`);
    });

    // Save comprehensive results to file
    const fs = require('fs');
    const output = {
        timestamp: new Date().toISOString(),
        filters: {
            department: 'Department of Defense',
            naics: '31-33 - Manufacturing',
            states: 'All 50 US States',
            dateRange: 'Past Week',
            status: 'Active and Inactive'
        },
        summary: {
            totalUniqueAwardees: sortedAllAwardees.length,
            statesProcessed: states.length,
            statesWithResults: Object.values(resultsByState).filter(r => r.count > 0).length
        },
        allUniqueAwardees: sortedAllAwardees,
        resultsByState: resultsByState
    };

    const filename = `dod_awardees_all_states_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`\nResults saved to: ${filename}`);

    await browser.close();

    return {
        allAwardees: sortedAllAwardees,
        byState: resultsByState
    };
}

// Run the script
collectDODAwardees()
    .then(results => {
        console.log('\nScript completed successfully!');
        console.log(`Found ${results.allAwardees.length} unique awardees across all states`);
        process.exit(0);const { chromium } = require('playwright');

        async function collectDODAwardees() {
            const browser = await chromium.launch({
                headless: true, // Set to true for production
                //slowMo: 50 // Remove for production
            });

            const context = await browser.newContext();
            const page = await context.newPage();

            // Set a longer timeout for SAM.gov which can be slow
            page.setDefaultTimeout(8000);

            // All 50 US states with their abbreviations
            const states = [
                { key: 'AL', name: 'Alabama' },
                { key: 'AK', name: 'Alaska' },
                { key: 'AZ', name: 'Arizona' },
                { key: 'AR', name: 'Arkansas' },
                { key: 'CA', name: 'California' },
                { key: 'CO', name: 'Colorado' },
                { key: 'CT', name: 'Connecticut' },
                { key: 'DE', name: 'Delaware' },
                { key: 'FL', name: 'Florida' },
                { key: 'GA', name: 'Georgia' },
                { key: 'HI', name: 'Hawaii' },
                { key: 'ID', name: 'Idaho' },
                { key: 'IL', name: 'Illinois' },
                { key: 'IN', name: 'Indiana' },
                { key: 'IA', name: 'Iowa' },
                { key: 'KS', name: 'Kansas' },
                { key: 'KY', name: 'Kentucky' },
                { key: 'LA', name: 'Louisiana' },
                { key: 'ME', name: 'Maine' },
                { key: 'MD', name: 'Maryland' },
                { key: 'MA', name: 'Massachusetts' },
                { key: 'MI', name: 'Michigan' },
                { key: 'MN', name: 'Minnesota' },
                { key: 'MS', name: 'Mississippi' },
                { key: 'MO', name: 'Missouri' },
                { key: 'MT', name: 'Montana' },
                { key: 'NE', name: 'Nebraska' },
                { key: 'NV', name: 'Nevada' },
                { key: 'NH', name: 'New Hampshire' },
                { key: 'NJ', name: 'New Jersey' },
                { key: 'NM', name: 'New Mexico' },
                { key: 'NY', name: 'New York' },
                { key: 'NC', name: 'North Carolina' },
                { key: 'ND', name: 'North Dakota' },
                { key: 'OH', name: 'Ohio' },
                { key: 'OK', name: 'Oklahoma' },
                { key: 'OR', name: 'Oregon' },
                { key: 'PA', name: 'Pennsylvania' },
                { key: 'RI', name: 'Rhode Island' },
                { key: 'SC', name: 'South Carolina' },
                { key: 'SD', name: 'South Dakota' },
                { key: 'TN', name: 'Tennessee' },
                { key: 'TX', name: 'Texas' },
                { key: 'UT', name: 'Utah' },
                { key: 'VT', name: 'Vermont' },
                { key: 'VA', name: 'Virginia' },
                { key: 'WA', name: 'Washington' },
                { key: 'WV', name: 'West Virginia' },
                { key: 'WI', name: 'Wisconsin' },
                { key: 'WY', name: 'Wyoming' }
            ];

            const allUniqueAwardees = new Set();
            const resultsByState = {};

            console.log(`Starting collection for all ${states.length} states...`);

            for (let i = 0; i < states.length; i++) {
                const state = states[i];

                console.log(`\n========================================`);
                console.log(`Processing ${state.name} (${state.key}) - ${i + 1}/${states.length}`);
                console.log(`========================================`);

                // Build URL for this state
                const url = `https://sam.gov/search/?page=1&pageSize=100&sort=-modifiedDate&index=opp&sfm%5BsimpleSearch%5D%5BkeywordRadio%5D=ALL&sfm%5BsimpleSearch%5D%5BkeywordEditorTextarea%5D=&sfm%5Bstatus%5D%5Bis_active%5D=true&sfm%5Bstatus%5D%5Bis_inactive%5D=true&sfm%5Bdates%5D%5BupdatedDate%5D%5BupdatedDateSelect%5D=pastWeek&sfm%5BserviceClassificationWrapper%5D%5Bnaics%5D%5B0%5D%5Bkey%5D=31-33&sfm%5BserviceClassificationWrapper%5D%5Bnaics%5D%5B0%5D%5Bvalue%5D=31-33%20-%20Manufacturing&sfm%5BawardeeDetails%5D%5Bstate%5D%5B0%5D%5Bkey%5D=${state.key}&sfm%5BawardeeDetails%5D%5Bstate%5D%5B0%5D%5Bvalue%5D=${state.key}%20-%20${encodeURIComponent(state.name)}&sfm%5BagencyPicker%5D%5B0%5D%5BorgKey%5D=100000000&sfm%5BagencyPicker%5D%5B0%5D%5BorgText%5D=097%20-%20DEPT%20OF%20DEFENSE&sfm%5BagencyPicker%5D%5B0%5D%5BlevelText%5D=Dept%20%2F%20Ind.%20Agency&sfm%5BagencyPicker%5D%5B0%5D%5Bhighlighted%5D=true`;

                try {
                    console.log(`Navigating to SAM.gov for ${state.name}...`);
                    await page.goto(url, { waitUntil: 'networkidle' });

                    // Wait for the search results to load (or no results message)
                    console.log('Waiting for search results to load...');

                    try {
                        await page.waitForSelector('app-opportunity-result', { timeout: 5000 });

                        // Additional wait to ensure all content is rendered
                        await page.waitForTimeout(2000);

                        // Wait for results to be visible
                        await page.waitForSelector('app-opportunity-result', { state: 'visible' });

                        // Extract awardee names from the current page
                        const awardees = await page.evaluate(() => {
                            const results = [];

                            // Select all opportunity result cards
                            const cards = document.querySelectorAll('app-opportunity-result');

                            cards.forEach(card => {
                                // Look for the awardee field within each card
                                const awardeeElements = card.querySelectorAll('.sds-field');

                                awardeeElements.forEach(field => {
                                    const fieldName = field.querySelector('.sds-field__name');
                                    const fieldValue = field.querySelector('.sds-field__value');

                                    if (fieldName && fieldValue) {
                                        const nameText = fieldName.textContent.trim();
                                        if (nameText === 'Awardee') {
                                            const awardeeValue = fieldValue.textContent.trim();
                                            if (awardeeValue) {
                                                results.push(awardeeValue);
                                            }
                                        }
                                    }
                                });
                            });

                            return results;
                        });

                        const stateUniqueAwardees = new Set();

                        // Add awardees to both state-specific and global sets
                        awardees.forEach(awardee => {
                            if (awardee) {
                                stateUniqueAwardees.add(awardee);
                                allUniqueAwardees.add(awardee);
                            }
                        });

                        const stateAwardeesArray = Array.from(stateUniqueAwardees).sort();
                        resultsByState[state.key] = {
                            stateName: state.name,
                            count: stateAwardeesArray.length,
                            awardees: stateAwardeesArray
                        };

                        console.log(`Found ${awardees.length} total awardees, ${stateUniqueAwardees.size} unique for ${state.name}`);

                    } catch (timeoutError) {
                        console.log(`No results found for ${state.name} (timeout waiting for results)`);
                        resultsByState[state.key] = {
                            stateName: state.name,
                            count: 0,
                            awardees: []
                        };
                    }

                } catch (error) {
                    console.error(`Error processing ${state.name}:`, error.message);
                    resultsByState[state.key] = {
                        stateName: state.name,
                        count: 0,
                        awardees: [],
                        error: error.message
                    };
                }

                // Small delay between states to be respectful to the server
                await page.waitForTimeout(200);
            }

            // Convert global set to sorted array for output
            const sortedAllAwardees = Array.from(allUniqueAwardees).sort();

            console.log('\n========================================');
            console.log('COLLECTION COMPLETE - ALL STATES');
            console.log('========================================');
            console.log(`Total unique DOD contract awardees found across all states: ${sortedAllAwardees.length}`);

            console.log('\nResults by State:');
            console.log('----------------');
            states.forEach(state => {
                const stateResult = resultsByState[state.key];
                console.log(`${state.name}: ${stateResult.count} unique awardees`);
            });

            console.log('\nAll Unique Awardees (alphabetically sorted):');
            console.log('--------------------------------------------');
            sortedAllAwardees.forEach((awardee, index) => {
                console.log(`${index + 1}. ${awardee}`);
            });

            // Save comprehensive results to file
            const fs = require('fs');
            const output = {
                timestamp: new Date().toISOString(),
                filters: {
                    department: 'Department of Defense',
                    naics: '31-33 - Manufacturing',
                    states: 'All 50 US States',
                    dateRange: 'Past Week',
                    status: 'Active and Inactive'
                },
                summary: {
                    totalUniqueAwardees: sortedAllAwardees.length,
                    statesProcessed: states.length,
                    statesWithResults: Object.values(resultsByState).filter(r => r.count > 0).length
                },
                allUniqueAwardees: sortedAllAwardees,
                resultsByState: resultsByState
            };

            const filename = `dod_awardees_all_states_${new Date().toISOString().split('T')[0]}.json`;
            fs.writeFileSync(filename, JSON.stringify(output, null, 2));
            console.log(`\nResults saved to: ${filename}`);

            await browser.close();

            return {
                allAwardees: sortedAllAwardees,
                byState: resultsByState
            };
        }

// Run the script
        collectDODAwardees()
            .then(results => {
                console.log('\nScript completed successfully!');
                console.log(`Found ${results.allAwardees.length} unique awardees across all states`);
                process.exit(0);
            })
            .catch(error => {
                console.error('Error occurred:', error);
                process.exit(1);
            });
    })
    .catch(error => {
        console.error('Error occurred:', error);
        process.exit(1);
    });