import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// Multer configuration for temporary storage
const upload = multer({ dest: 'uploads/' });

// Root endpoint
app.get('/', (req, res) => {
  res.send('PDF-to-QR API is running');
});

// Upload endpoint
app.post('/api/documents/upload', upload.single('pdf'), async (req, res) => {
  try {
    const { title, folio: rawFolio } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Auto-generate folio if empty (e.g. FOL-2026-3F2A9B1C)
    let folio = rawFolio?.trim();
    if (!folio) {
      const year = new Date().getFullYear();
      const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
      folio = `FOL-${year}-${rand}`;
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const fileContent = fs.readFileSync(file.path);

    // 1. Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, fileContent, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (storageError) throw storageError;

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pdfs')
      .getPublicUrl(fileName);

    // 3. Save to Database
    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert([
        {
          title,
          folio,
          file_url: publicUrl,
          file_name: fileName,
        }
      ])
      .select();

    if (dbError) throw dbError;

    // Clean up local file
    fs.unlinkSync(file.path);

    res.status(201).json(dbData[0]);
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all documents
app.get('/api/documents', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete document
// QR/PDF viewer endpoint - serve PDF by folio
app.get('/v/:folio', async (req, res) => {
  try {
    const { folio } = req.params;

    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('file_url, file_name')
      .eq('folio', folio)
      .single();

    if (fetchError) throw fetchError;
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Get the full public URL
    const publicUrl = doc.file_url;

    // Redirect to the PDF URL so the browser can display it
    res.redirect(publicUrl);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get file name first to delete from storage
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('file_name')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Delete from storage
    const { error: storageError } = await supabase.storage
      .from('pdfs')
      .remove([doc.file_name]);

    if (storageError) throw storageError;

    // 3. Delete from DB
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
