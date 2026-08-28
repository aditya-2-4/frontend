const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        if (fs.lstatSync(path.join(from, element)).isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}

const source = path.join(__dirname, 'dist');
const dest = path.join(__dirname, '..', 'framguard-backend', 'public');

console.log('Copying frontend build to backend public folder...');
try {
    copyFolderSync(source, dest);
    console.log('Successfully synced frontend with backend!');
} catch (e) {
    console.error('Failed to copy files:', e);
}
