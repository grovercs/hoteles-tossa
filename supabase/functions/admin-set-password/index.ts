// Edge Function: admin-set-password
// Hotel L'Hostalet de Tossa — Cambiar la contraseña de un usuario desde la
// seccion de Usuarios (solo Administrador).
//
// Por que hace falta una Edge Function:
//  - Un usuario (incluso Admin) NO puede cambiar la contraseña de OTRO desde
//    el navegador. Supabase Auth solo permite cambiar la propia.
//  - Cambiar la de otro requiere la service_role key, que NUNCA puede ir al
//    frontend. Esta funcion la usa en el servidor (Supabase la inyecta) tras
//    verificar que quien llama es Administrador.
//
// Seguridad:
//  - Requiere JWT valido (Authorization: Bearer <token>).
//  - Solo role = "Administrador" en profiles puede usarla.
//  - La service_role key vive solo en el servidor (Deno.env), nunca se expone.
//
// Body: { userId: string, newPassword: string }
// Respuesta: { ok: true }  |  { error: string }
//
// Despliegue:
//   supabase functions deploy admin-set-password --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

// Verifica JWT + que el llamador sea Administrador. Devuelve su userId.
async function authorize(req: Request, supabaseUrl: string, serviceRoleKey: string) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Falta el token de autenticación.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) throw new Error("Token inválido o expirado.");
  const callerId = userData.user.id;

  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", callerId)
    .limit(1);
  if (profileErr) throw new Error("No se pudo verificar el perfil.");
  const role = profiles?.[0]?.role;
  const isActive = profiles?.[0]?.is_active !== false;
  if (!isActive) throw new Error("Usuario inactivo.");
  if (role !== "Administrador") {
    throw new Error("Solo un Administrador puede cambiar contraseñas.");
  }
  return { callerId };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Faltan variables de entorno de Supabase." }, 500);
    }

    const { callerId } = await authorize(req, supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const targetId = String(body?.userId || "");
    const newPassword = String(body?.newPassword || "");

    if (!targetId) return json({ error: "Falta 'userId'." }, 400);
    if (newPassword.length < 6) {
      return json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: updErr } = await supabase.auth.admin.updateUserById(targetId, {
      password: newPassword,
    });
    if (updErr) throw new Error(updErr.message || "No se pudo actualizar la contraseña.");

    return json({ ok: true, changedBy: callerId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno.";
    const status = /inválido|expirado|Solo un Administrador|inactivo|Falta el token/i.test(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});