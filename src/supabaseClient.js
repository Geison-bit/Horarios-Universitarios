import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lcnmlrghlhdqnskxtkjr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjbm1scmdobGhkcW5za3h0a2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NTU5NTAsImV4cCI6MjA3MDMzMTk1MH0.AF2aTgrFtlG-CJOtbA7jhycBdbg2k55VJaOEV5de2Rk";
export const supabase = createClient(supabaseUrl, supabaseKey);
