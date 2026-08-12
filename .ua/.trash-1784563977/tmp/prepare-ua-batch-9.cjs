const fs = require('fs');
const [batchesPath, inputPath, projectRoot] = process.argv.slice(2);
const all = JSON.parse(fs.readFileSync(batchesPath, 'utf8'));
const batch = all.batches.find((item) => item.batchIndex === 9);
if (!batch) throw new Error('batchIndex 9 not found');
const batchFiles = batch.files.map(({path, language, sizeLines, fileCategory}) => ({path, language, sizeLines, fileCategory}));
fs.writeFileSync(inputPath, JSON.stringify({projectRoot, batchFiles, batchImportData: batch.batchImportData}, null, 2));
