import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gwzprawicsvpblizkorg.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '<KEY_WAS_HERE>';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBucket() {
    console.log("Testing connection to Supabase...");
    
    // Test 1: Check if bucket exists by trying to get public URL of a dummy file
    const { data } = supabase.storage.from('event-images').getPublicUrl('test.jpg');
    console.log("Public URL test:", data.publicUrl);
    
    // Test 2: List buckets (might be denied by RLS but let's see what it returns)
    console.log("Listing buckets (might be denied)...");
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.log("Error listing buckets (expected if RLS blocks anon from listing):", bucketError.message);
    } else {
        console.log("Buckets found:", buckets.map(b => b.name));
    }
    
    // Test 3: Upload a dummy tiny file
    console.log("Attempting test upload...");
    const dummyBlob = new Blob(['helloworld'], { type: 'text/plain' });
    const { data: uploadData, error: uploadError } = await supabase.storage.from('event-images').upload('test-file.txt', dummyBlob);
    
    if (uploadError) {
        console.error("Upload failed immediately with error:", uploadError);
    } else {
        console.log("Upload succeeded! Dummy file uploaded.");
        // Clean it up
        await supabase.storage.from('event-images').remove(['test-file.txt']);
    }
}

testBucket().catch(console.error);
