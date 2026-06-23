# Edge Function `admin-set-password`

Permite que un **Administrador** cambie la contraseña de cualquier usuario
desde la sección **Usuarios** de la app (tab Setup).

## Por qué hace falta una Edge Function

Un usuario (incluso Admin) **no puede** cambiar la contraseña de OTRO desde el
navegador: Supabase Auth solo permite cambiar la propia. Cambiar la de otro
requiere la `service_role` key, que **nunca** puede ir al frontend. Esta función
la usa dentro del servidor (Supabase la inyecta automáticamente) tras verificar
que quien llama es Administrador.

## Qué hace

1. Valida el JWT del llamador (`Authorization: Bearer <token>`).
2. Comprueba que su `profiles.role` sea **Administrador** y esté activo.
3. Llama a `supabase.auth.admin.updateUserById(targetId, { password })`.
4. Devuelve `{ ok: true }`.

## Desplegar

```bash
supabase functions deploy admin-set-password --no-verify-jwt
```

`--no-verify-jwt` deja que la función lea el JWT del header y compruebe el rol
Admin en el código.

> No hay que configurar ningún secret: `SUPABASE_URL` y
> `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente.

## Probar

```bash
curl -X POST https://<tu-project-ref>.functions.supabase.co/admin-set-password \
  -H "Authorization: Bearer <access_token_de_un_admin>" \
  -H "apikey: <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<uuid_del_usuario>","newPassword":"nuevaclave123"}'
```

## Notas

- Mínimo 6 caracteres (política por defecto de Supabase). Si cambias la política
  de contraseñas en Supabase, ajusta la validación de la función.
- La contraseña viaja cifrada (HTTPS) del navegador a la función; la
  `service_role` nunca sale del servidor.
- Un Admin puede cambiar también su propia contraseña con este botón.