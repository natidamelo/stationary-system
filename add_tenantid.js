const fs = require('fs');
const path = require('path');

const schemaDir = path.join(__dirname, 'backend', 'src', 'schemas');
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.schema.ts') && f !== 'tenant.schema.ts');

files.forEach(file => {
  const filePath = path.join(schemaDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // ensure Types is imported from mongoose
  if (!content.includes('Types')) {
    content = content.replace(/import { Document } from 'mongoose';/, "import { Document, Types } from 'mongoose';");
  }

  // check if tenantId is already there
  if (!content.includes('tenantId: Types.ObjectId')) {
    // Add the tenantId prop right after the class declaration
    content = content.replace(/(export class \w+ extends Document \{)/, 
      "$1\n  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })\n  tenantId: Types.ObjectId;\n");
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
