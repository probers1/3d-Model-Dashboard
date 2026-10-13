const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Helper to generate a minimal ASCII STL
function generateSTL(name = 'sample') {
  return `solid ${name}
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 20 0 0
      vertex 20 20 0
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 20 20 0
      vertex 0 20 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 20 0
      vertex 20 20 0
      vertex 20 20 20
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 20 0
      vertex 20 20 20
      vertex 0 20 20
    endloop
  endfacet
endsolid ${name}`;
}

// Helper to generate a minimal OBJ
function generateOBJ() {
  return `# Minimal OBJ
v 0.0 0.0 0.0
v 15.0 0.0 0.0
v 15.0 15.0 0.0
v 0.0 15.0 0.0
v 0.0 0.0 15.0
v 15.0 0.0 15.0
v 15.0 15.0 15.0
v 0.0 15.0 15.0
f 1 2 3 4
f 5 6 7 8
f 1 2 6 5
f 2 3 7 6
f 3 4 8 7
f 4 1 5 8
`;
}

// Helper to generate a minimal valid 3MF
function generate3MF() {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0"/>
          <vertex x="20" y="0" z="0"/>
          <vertex x="20" y="20" z="0"/>
          <vertex x="0" y="20" z="0"/>
          <vertex x="0" y="0" z="20"/>
          <vertex x="20" y="0" z="20"/>
          <vertex x="20" y="20" z="20"/>
          <vertex x="0" y="20" z="20"/>
        </vertices>
        <triangles>
          <triangle v1="0" v2="2" v3="1"/>
          <triangle v1="0" v2="3" v3="2"/>
          <triangle v1="4" v2="5" v3="6"/>
          <triangle v1="4" v2="6" v3="7"/>
          <triangle v1="0" v2="1" v3="5"/>
          <triangle v1="0" v2="5" v3="4"/>
          <triangle v1="1" v2="2" v3="6"/>
          <triangle v1="1" v2="6" v3="5"/>
          <triangle v1="2" v2="3" v3="7"/>
          <triangle v1="2" v2="7" v3="6"/>
          <triangle v1="3" v2="0" v3="4"/>
          <triangle v1="3" v2="4" v3="7"/>
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1"/>
  </build>
</model>`;

  const zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from(contentTypes, 'utf-8'));
  zip.addFile('_rels/.rels', Buffer.from(rels, 'utf-8'));
  zip.addFile('3D/3dmodel.model', Buffer.from(model, 'utf-8'));
  return zip.toBuffer();
}

async function runTests() {
  const PORT = 3456;
  const TEST_DATA_DIR = path.join(__dirname, 'test_data');
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

  process.env.PORT = PORT;
  process.env.DATA_DIR = TEST_DATA_DIR;
  process.env.ADMIN_USER = 'admin';
  process.env.ADMIN_PASSWORD = 'adminpassword';
  process.env.SESSION_SECRET = 'test-secret';

  console.log('--- Starting Server in-process ---');
  require('./server');

  // Allow server to listen
  await new Promise(r => setTimeout(r, 1000));
  const baseUrl = `http://localhost:${PORT}`;

  let adminCookie = '';

  console.log('\n[Test 1] Login as initial admin user');
  {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'adminpassword' })
    });
    const data = await res.json();
    if (!res.ok || data.user.role !== 'admin') {
      throw new Error('Admin login failed: ' + JSON.stringify(data));
    }
    const setCookie = res.headers.get('set-cookie');
    adminCookie = setCookie.split(';')[0];
    console.log('✓ Admin login successful, user:', data.user.username, 'role:', data.user.role);
  }

  console.log('\n[Test 2] Verify /api/auth/me session');
  {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Cookie': adminCookie }
    });
    const data = await res.json();
    if (!res.ok || data.user.username !== 'admin') {
      throw new Error('/api/auth/me failed');
    }
    console.log('✓ /api/auth/me returned correct session');
  }

  console.log('\n[Test 3] Admin creates new standard user "maker1"');
  {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ username: 'maker1', password: 'makerpassword', role: 'user' })
    });
    const data = await res.json();
    if (!res.ok || data.username !== 'maker1') {
      throw new Error('User creation failed: ' + JSON.stringify(data));
    }
    console.log('✓ Created user maker1 with role:', data.role);
  }

  console.log('\n[Test 4] Login as newly created user "maker1"');
  let userCookie = '';
  {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'maker1', password: 'makerpassword' })
    });
    const data = await res.json();
    if (!res.ok || data.user.username !== 'maker1') {
      throw new Error('maker1 login failed');
    }
    userCookie = res.headers.get('set-cookie').split(';')[0];
    console.log('✓ maker1 logged in successfully');
  }

  console.log('\n[Test 5] Upload multiple STL files as a single model');
  let multiModelId = '';
  {
    const stl1 = generateSTL('bracket_partA');
    const stl2 = generateSTL('bracket_partB');

    const formData = new FormData();
    formData.append('title', 'Dual Bracket Assembly');
    formData.append('description', 'Two-part mounting bracket for 3D printer frame');
    formData.append('tags', 'bracket, voron, functional');
    formData.append('files', new Blob([stl1], { type: 'model/stl' }), 'partA.stl');
    formData.append('files', new Blob([stl2], { type: 'model/stl' }), 'partB.stl');

    const res = await fetch(`${baseUrl}/api/models`, {
      method: 'POST',
      headers: { 'Cookie': userCookie },
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error('Multi-file model upload failed: ' + JSON.stringify(data));
    }
    multiModelId = data.id;
    console.log('✓ Multi-file model created with id:', multiModelId);

    // Verify model details and file records
    const detailRes = await fetch(`${baseUrl}/api/models/${multiModelId}`, {
      headers: { 'Cookie': userCookie }
    });
    const modelDetail = await detailRes.json();
    if (modelDetail.files.length !== 2) {
      throw new Error('Expected 2 files, found: ' + modelDetail.files.length);
    }
    console.log('✓ Model files count verified:', modelDetail.files.length);

    // Verify thumbnail exists and is served
    const thumbRes = await fetch(`${baseUrl}/api/models/${multiModelId}/thumbnail`);
    if (!thumbRes.ok || thumbRes.headers.get('content-type') !== 'image/png') {
      throw new Error('Thumbnail request failed');
    }
    const thumbBuf = await thumbRes.arrayBuffer();
    console.log(`✓ Thumbnail generated and served (${thumbBuf.byteLength} bytes)`);
  }

  console.log('\n[Test 6] Upload a .zip archive (auto-extraction of 3D models)');
  let zipModelId = '';
  {
    const zip = new AdmZip();
    zip.addFile('main_chassis.stl', Buffer.from(generateSTL('chassis')));
    zip.addFile('knob.obj', Buffer.from(generateOBJ()));
    zip.addFile('readme.txt', Buffer.from('This is a text file that should be ignored'));
    const zipBuffer = zip.toBuffer();

    const formData = new FormData();
    formData.append('title', 'Complete Enclosure Kit');
    formData.append('description', 'Chassis and knob packed inside a zip');
    formData.append('tags', 'enclosure, electronics');
    formData.append('files', new Blob([zipBuffer], { type: 'application/zip' }), 'enclosure_kit.zip');

    const res = await fetch(`${baseUrl}/api/models`, {
      method: 'POST',
      headers: { 'Cookie': userCookie },
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error('Zip upload failed: ' + JSON.stringify(data));
    }
    zipModelId = data.id;
    console.log('✓ Zip model extracted and created with id:', zipModelId);

    const detailRes = await fetch(`${baseUrl}/api/models/${zipModelId}`, {
      headers: { 'Cookie': userCookie }
    });
    const detail = await detailRes.json();
    console.log('✓ Extracted files:', detail.files.map(f => `${f.original_name} (${f.file_ext})`));
    if (detail.files.length !== 2) {
      throw new Error('Expected 2 extracted 3D files from zip, found: ' + detail.files.length);
    }
  }

  console.log('\n[Test 7] Search and filter models');
  {
    const res = await fetch(`${baseUrl}/api/models?q=bracket`, {
      headers: { 'Cookie': userCookie }
    });
    const list = await res.json();
    if (list.length !== 1 || list[0].id !== multiModelId) {
      throw new Error('Search failed: expected 1 match for "bracket"');
    }
    console.log('✓ Search filter returned correct matching model');

    // Test GET /api/tags
    const tagsRes = await fetch(`${baseUrl}/api/tags`, {
      headers: { 'Cookie': userCookie }
    });
    const tagsList = await tagsRes.json();
    console.log('✓ Tag aggregation returned:', tagsList);
    if (!tagsList.some(t => t.tag === 'enclosure') || !tagsList.some(t => t.tag === 'voron')) {
      throw new Error('Tags list missing expected tags');
    }

    // Test tag-specific filter
    const tagFilterRes = await fetch(`${baseUrl}/api/models?tag=enclosure`, {
      headers: { 'Cookie': userCookie }
    });
    const taggedModels = await tagFilterRes.json();
    if (taggedModels.length !== 1 || taggedModels[0].id !== zipModelId) {
      throw new Error('Tag filter failed: expected 1 match for "enclosure"');
    }
    console.log('✓ Explicit tag filter query returned correct matching model');

    // Test multiple tags filter
    const multiTagsRes = await fetch(`${baseUrl}/api/models?tags=enclosure,voron`, {
      headers: { 'Cookie': userCookie }
    });
    const multiTaggedModels = await multiTagsRes.json();
    if (multiTaggedModels.length !== 2) {
      throw new Error('Multi-tag filter failed: expected 2 matches for "enclosure,voron", got: ' + multiTaggedModels.length);
    }
    console.log('✓ Multi-tag filter query returned both matching models');
  }

  console.log('\n[Test 8] Edit model metadata');
  {
    const res = await fetch(`${baseUrl}/api/models/${multiModelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': userCookie },
      body: JSON.stringify({
        title: 'Updated Dual Bracket Assembly v2',
        tags: 'bracket, voron, upgraded',
        description: 'Updated with reinforced gussets'
      })
    });
    if (!res.ok) throw new Error('Metadata edit failed');

    const detailRes = await fetch(`${baseUrl}/api/models/${multiModelId}`, {
      headers: { 'Cookie': userCookie }
    });
    const updated = await detailRes.json();
    if (updated.title !== 'Updated Dual Bracket Assembly v2' || updated.tags !== 'bracket, voron, upgraded') {
      throw new Error('Updated metadata mismatch');
    }
    console.log('✓ Metadata successfully updated');
  }

  console.log('\n[Test 9] Delete single file from model');
  {
    const detailRes = await fetch(`${baseUrl}/api/models/${multiModelId}`, {
      headers: { 'Cookie': userCookie }
    });
    const detail = await detailRes.json();
    const fileToDelete = detail.files[0];

    const delRes = await fetch(`${baseUrl}/api/models/${multiModelId}/files/${fileToDelete.id}`, {
      method: 'DELETE',
      headers: { 'Cookie': userCookie }
    });
    if (!delRes.ok) throw new Error('Delete file failed');

    const afterRes = await fetch(`${baseUrl}/api/models/${multiModelId}`, {
      headers: { 'Cookie': userCookie }
    });
    const afterDetail = await afterRes.json();
    if (afterDetail.files.length !== 1) {
      throw new Error('Expected 1 file remaining after delete');
    }
    console.log('✓ Single file deleted, remaining files:', afterDetail.files.length);
  }

  console.log('\n[Test 10] Download all files as a single ZIP');
  {
    const res = await fetch(`${baseUrl}/api/models/${zipModelId}/download-all`, {
      headers: { 'Cookie': userCookie }
    });
    if (!res.ok || res.headers.get('content-type') !== 'application/zip') {
      throw new Error('Download-all zip failed');
    }
    const buf = await res.arrayBuffer();
    const downloadedZip = new AdmZip(Buffer.from(buf));
    const entries = downloadedZip.getEntries().map(e => e.entryName);
    console.log('✓ Downloaded zip verified, contained entries:', entries);
    if (entries.length !== 2) {
      throw new Error('Downloaded zip expected 2 entries');
    }
  }

  console.log('\n[Test 11] Delete entire model');
  {
    const res = await fetch(`${baseUrl}/api/models/${zipModelId}`, {
      method: 'DELETE',
      headers: { 'Cookie': userCookie }
    });
    if (!res.ok) throw new Error('Delete model failed');

    const getRes = await fetch(`${baseUrl}/api/models/${zipModelId}`, {
      headers: { 'Cookie': userCookie }
    });
    if (getRes.status !== 404) {
      throw new Error('Model still exists after delete');
    }
    console.log('✓ Model deleted successfully');
  }

  console.log('\n[Test 12] Upload and render a .3mf model file');
  {
    const mfBuffer = generate3MF();
    const formData = new FormData();
    formData.append('title', 'Test 3MF Cube Model');
    formData.append('description', 'Native 3MF format upload test');
    formData.append('tags', '3mf, test, cube');
    formData.append('files', new Blob([mfBuffer], { type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' }), 'test_cube.3mf');

    const res = await fetch(`${baseUrl}/api/models`, {
      method: 'POST',
      headers: { 'Cookie': userCookie },
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error('3MF model upload failed: ' + JSON.stringify(data));
    }
    const mfModelId = data.id;
    console.log('✓ 3MF model created with id:', mfModelId);

    // Verify model details and file records
    const detailRes = await fetch(`${baseUrl}/api/models/${mfModelId}`, {
      headers: { 'Cookie': userCookie }
    });
    const modelDetail = await detailRes.json();
    if (modelDetail.files.length !== 1 || modelDetail.files[0].file_ext !== '3mf') {
      throw new Error('Expected 1 .3mf file, found: ' + JSON.stringify(modelDetail.files));
    }
    console.log('✓ 3MF file record verified:', modelDetail.files[0].original_name, `(${modelDetail.files[0].file_ext})`);

    // Verify thumbnail exists and is served for 3MF
    const thumbRes = await fetch(`${baseUrl}/api/models/${mfModelId}/thumbnail`);
    if (!thumbRes.ok || thumbRes.headers.get('content-type') !== 'image/png') {
      throw new Error('3MF Thumbnail request failed');
    }
    const thumbBuf = await thumbRes.arrayBuffer();
    if (thumbBuf.byteLength < 1000) {
      throw new Error('3MF Thumbnail too small: ' + thumbBuf.byteLength);
    }
    console.log(`✓ 3MF Thumbnail generated and served (${thumbBuf.byteLength} bytes)`);
  }

  console.log('\n[Test 13] Security: UUID validation on /api/models/:id/thumbnail');
  {
    const invalidIdRes = await fetch(`${baseUrl}/api/models/invalid-non-uuid/thumbnail`);
    if (invalidIdRes.status !== 400) {
      throw new Error(`Expected 400 for invalid UUID, got ${invalidIdRes.status}`);
    }
    const pathTraversalRes = await fetch(`${baseUrl}/api/models/..%2f..%2fpackage.json/thumbnail`);
    if (pathTraversalRes.status !== 400) {
      throw new Error(`Expected 400 for path traversal attempt, got ${pathTraversalRes.status}`);
    }
    console.log('✓ Invalid ID and path traversal blocked with HTTP 400');
  }

  console.log('\n[Test 14] Instant upload via decoupled background thumbnail queue');
  {
    const stl = generateSTL('speed_test');
    const formData = new FormData();
    formData.append('title', 'Instant Upload Test');
    formData.append('tags', 'speed, benchmark');
    formData.append('files', new Blob([stl], { type: 'model/stl' }), 'speed.stl');

    const startTime = Date.now();
    const res = await fetch(`${baseUrl}/api/models`, {
      method: 'POST',
      headers: { 'Cookie': userCookie },
      body: formData
    });
    const elapsed = Date.now() - startTime;
    const data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error('Upload failed: ' + JSON.stringify(data));
    }
    console.log(`✓ Model created in ${elapsed}ms (decoupled from Puppeteer rendering)`);

    // Verify thumbnail is served from the background queue
    const thumbRes = await fetch(`${baseUrl}/api/models/${data.id}/thumbnail`);
    if (!thumbRes.ok) {
      throw new Error('Background thumbnail failed to resolve');
    }
    console.log('✓ Background thumbnail successfully retrieved');
  }

  console.log('\n======================================================');
  console.log(' ALL 14 END-TO-END SPEC TESTS PASSED SUCCESSFULLY! ');
  console.log('======================================================\n');

  const { closeBrowser } = require('./thumbnail');
  await closeBrowser();
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
