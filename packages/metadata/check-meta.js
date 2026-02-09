const { exiftool } = require('exiftool-vendored');

async function main() {
  const file = 'c:/Users/User/Desktop/ContextEmbed/apps/api/uploads/exports/test_extract/Joyful_Smith_Family_Portrait_Session_Captured_in_Studio_by_Matt_Pantling.jpg';
  
  const t = await exiftool.read(file);
  
  console.log('=== IPTC IIM (Legacy) Fields ===');
  console.log('ObjectName:', t.ObjectName);
  console.log('Headline:', t.Headline);
  console.log('Caption-Abstract:', t['Caption-Abstract'] ? 'present (' + t['Caption-Abstract'].length + ' chars)' : 'MISSING');
  console.log('Keywords:', t.Keywords ? 'present (' + t.Keywords.length + ' items)' : 'MISSING');
  console.log('By-line:', t['By-line']);
  console.log('Credit:', t.Credit);
  console.log('Source:', t.Source);
  console.log('CopyrightNotice:', t.CopyrightNotice);
  console.log('City:', t.City);
  console.log('Province-State:', t['Province-State']);
  console.log('Country:', t['Country-PrimaryLocationName']);
  
  console.log('\n=== XMP Dublin Core ===');
  console.log('Title:', t.Title);
  console.log('Creator:', t.Creator);
  console.log('Rights:', t.Rights);
  console.log('Subject:', t.Subject ? 'present (' + t.Subject.length + ' items)' : 'MISSING');
  console.log('Description:', t.Description ? 'present' : 'MISSING');
  
  console.log('\n=== EXIF ===');
  console.log('ImageDescription:', t.ImageDescription ? 'present' : 'MISSING');
  console.log('Artist:', t.Artist);
  console.log('Copyright:', t.Copyright);
  
  await exiftool.end();
}

main().catch(console.error);
