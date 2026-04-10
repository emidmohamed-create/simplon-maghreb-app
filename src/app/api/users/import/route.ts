import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ADMIN_ROLES } from '@/lib/rbac';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
  const { error } = await requireAuth(ADMIN_ROLES);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'Le fichier est vide ou invalide' }, { status: 400 });
    }

    // Le header doit être ignoré, on commence à i=1
    let createdCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Split CSV respecting comma or semicolon
      const separator = lines[i].includes(';') ? ';' : ',';
      const parts = lines[i].split(separator).map(p => p.trim());
      
      if (parts.length < 2) continue;

      let firstName = parts[0];
      let lastName = parts[1];
      let email = "";
      let role = "LEARNER";
      let password = "Simplon123!";

      // Logic to handle different column counts (if email is skipped)
      if (parts.length >= 3 && parts[2].includes('@')) {
        // We have an email in the third column
        email = parts[2];
        role = parts[3] || 'LEARNER';
        password = parts[4] || 'Simplon123!';
      } else {
        // No email or weird format, we generate one and shift columns
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@simplon.ma`.replace(/\s+/g, '');
        role = parts[2] || 'LEARNER';
        password = parts[3] || 'Simplon123!';
      }
      
      if (!firstName || !lastName || !email) {
        errorCount++;
        errors.push(`Ligne ${i + 1}: Données manquantes`);
        continue;
      }

      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        errorCount++;
        errors.push(`Ligne ${i + 1}: L'email ${email} est déjà utilisé`);
        continue;
      }

      try {
        const passwordHash = await hash(password, 12);
        
        await prisma.user.create({
          data: {
            firstName,
            lastName,
            email,
            role: role.toUpperCase().includes('ADMIN') ? 'ADMIN_CAMPUS' : role.toUpperCase(),
            passwordHash,
          }
        });
        createdCount++;
      } catch (err) {
        errorCount++;
        errors.push(`Ligne ${i + 1}: Erreur technique base de données`);
      }
    }

    return NextResponse.json({ success: true, createdCount, errorCount, errors }, { status: 200 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur lors du traitement du fichier' }, { status: 500 });
  }
}
