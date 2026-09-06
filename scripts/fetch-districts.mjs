import fs from 'fs';
import path from 'path';

async function run() {
  const regenciesPath = path.resolve('lib/territory/regencies_38.json');
  const allRegencies = JSON.parse(fs.readFileSync(regenciesPath, 'utf8'));

  // All provinces from regencies_38.json
  const targetProvinces = Object.keys(allRegencies);
  const districtsResult = {};

  for (const provId of targetProvinces) {
    const list = allRegencies[provId] || [];
    console.log(`Fetching districts for province ${provId} (${list.length} regencies)...`);
    
    // Batch in chunks of 5
    for (let i = 0; i < list.length; i += 5) {
      const chunk = list.slice(i, i + 5);
      await Promise.all(
        chunk.map(async (reg) => {
          try {
            const url = `https://emsifa.github.io/api-wilayah-indonesia/api/districts/${reg.id}.json`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              districtsResult[reg.id] = data.map((d) => ({
                id: d.id,
                code: d.id,
                name: d.name,
                parentId: d.regency_id,
              }));
            }
          } catch (e) {
            console.error(`Failed ${reg.id}:`, e.message);
          }
        })
      );
    }
  }

  console.log(`Total regencies with districts fetched: ${Object.keys(districtsResult).length}`);
  fs.writeFileSync(
    path.resolve('lib/territory/preloaded_districts.json'),
    JSON.stringify(districtsResult, null, 2),
    'utf8'
  );
  console.log('Saved to lib/territory/preloaded_districts.json');
}

run();
