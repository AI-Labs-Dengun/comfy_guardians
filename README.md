# Comfy Guardians - Authorization System

Web system for authorizing children's accounts through a form for guardians, integrated with the existing Supabase schema.

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example file and configure your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit the `.env.local` file and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Database Schema
The system uses the existing Supabase schema defined in `docs/schema_supabase.sql`. The main tables are:

#### `profiles` Table (existing)
- `id` - UUID (reference to auth.users)
- `name` - Child's name
- `username` - Unique username
- `guardian_email` - Guardian's email
- `authorized` - Authorization status (NULL = pending, TRUE = authorized, FALSE = rejected)
- `approval_token` - Unique token for authorization
- `user_role` - User role ('app', 'cms', 'psicologos')

#### `children_guardians` Table (existing)
- `child_name` - Child's name
- `child_birth_date` - Birth date
- `guardian_name` - Guardian's name
- `guardian_email` - Guardian's email (unique)
- `guardian_address` - Guardian's address
- `guardian_postal_code` - Postal code
- `terms_of_use` - Terms of use acceptance
- `gdpr_consent_declaration` - GDPR consent

### 4. Run in Development
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
npm start
```

## How It Works

### Authorization Flow

1. **Flutter Application** creates child profile in `profiles` table with `authorized = NULL`
2. **System** sends email to guardian with link containing `approval_token`
3. **Guardian** accesses: `/autorizar/[childId]?email=guardian@email.com`
4. **Form** is filled with guardian's data
5. **API** calls Supabase's `authorize_account()` function
6. **System** saves data in `children_guardians` table

### Authorization URL
```
http://localhost:3000/autorizar/[CHILD_ID]?email=[GUARDIAN_EMAIL]
```

### Example
```
http://localhost:3000/autorizar/123e4567-e89b-12d3-a456-426614174000?email=guardian@email.com
```

## Implemented Features

✅ **Existing Schema Integration**
- Uses existing `profiles` table
- Uses existing `children_guardians` table
- Utilizes native `authorize_account()` function

✅ **Security Validations**
- Guardian email verification
- `approval_token` validation
- Prevention of duplicate authorizations
- Automatic audit logs

✅ **Complete Form**
- Guardian's name
- Email (auto-filled)
- Complete address
- Postal code
- Terms of use
- GDPR consent

✅ **Modern Interface**
- Responsive design
- Visual feedback
- Real-time validation
- Loading states

✅ **Guardian System**
- `children_guardians` table for data storage
- `save_guardian_data()` function for validation
- Duplication prevention by email
- Complete audit with timestamps

## Project Structure

- `/src/app/autorizar/[childId]/page.tsx` - Form page
- `/src/app/api/autorizar/route.ts` - Authorization API
- `/src/lib/supabase.ts` - Configuration and types
- `/docs/schema_supabase.sql` - Database schema

## Flutter Integration

### Creating Child Profile
```sql
INSERT INTO profiles (
  id, name, username, avatar_path, guardian_email, 
  authorized, user_role, approval_token
) VALUES (
  'child-uuid', 'Child Name', 'username', '/avatar.jpg',
  'guardian@email.com', NULL, 'app', gen_random_uuid()
);
```

### Status Monitoring
```sql
SELECT authorized FROM profiles WHERE id = 'child-uuid';
```

### Email Sending
The Flutter system should send email with link containing:
- Child ID
- Guardian's email
- `approval_token` for validation

## Security

### Implemented Validations
1. **Guardian Email** - Must match registered email
2. **Approval Token** - Validation via native function
3. **Authorization Status** - Only pending accounts
4. **Duplication** - Prevention of duplicate records
5. **Audit** - Automatic logs of all actions

### Security Policies (RLS)
- Access controlled by guardian's email
- Functions with `SECURITY DEFINER`
- Unique token validation

## API Endpoints

### POST `/api/autorizar`
Processes authorization using Supabase's native function.

**Body:**
```json
{
  "childId": "child-uuid",
  "guardianName": "Guardian Name",
  "guardianEmail": "guardian@email.com",
  "guardianAddress": "Complete address",
  "guardianPostalCode": "0000-000",
  "termsOfUse": true,
  "gdprConsentDeclaration": true
}
```

**Responses:**
- `200`: Authorization processed successfully
- `400`: Invalid data
- `403`: Email doesn't match
- `404`: Child not found
- `409`: Already authorized or duplicate guardian
- `500`: Internal error

## Testing

### Test Guardian System
Run the test script in Supabase SQL Editor:
```sql
-- See file: md/test_children_guardians.sql
```

### Verify Functionality
1. Execute the updated schema in `md/schema_supabase.sql`
2. Test the `save_guardian_data()` function with sample data
3. Verify that the `children_guardians` table was created
4. Test the authorization form with valid data

## Documentation

- `md/CHILDREN_GUARDIANS.md` - Complete guardian system documentation
- `md/test_children_guardians.sql` - Test scripts
- `md/schema_supabase.sql` - Complete database schema

## Support

For issues and questions, check:
1. Environment variables configuration
2. Database schema in `md/schema_supabase.sql`
3. Error logs in console
4. Security policies (RLS) in Supabase
5. Documentation in `md/CHILDREN_GUARDIANS.md`
