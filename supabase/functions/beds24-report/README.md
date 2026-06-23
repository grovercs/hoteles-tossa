# Edge Function `beds24-report`

Conexión en vivo entre la pestaña **Informes Beds24** y la API de Beds24.
Sustituye (o complementa) la subida manual del `.xls`: el usuario elige un rango
de fechas en la app y la función devuelve el mismo JSON que produce el parser del
`.xls`, pero obtenido en vivo desde Beds24.

## Qué hace

1. Valida el JWT de Supabase del usuario.
2. Comprueba que su `profiles.role` sea **Administrador** o **Dirección**.
3. Llama a `getBookings` (con `includeInvoice`) de Beds24 para el rango pedido.
4. Agrega ingresos, noches ocupadas, ADR, RevPAR y ocupación por día.
5. Devuelve `{ days, totals, months, range, variant }` (mismo *shape* que el `.xls`).

## Requisitos

- CLI de Supabase: `npm i -g supabase`
- Haber hecho `supabase login` y `supabase link --project-ref <tu-project-ref>`

## Configurar los secrets

Las credenciales de Beds24 **no se suben al repo**; van como secrets del proyecto:

```bash
supabase secrets set \
  BEDS24_API_KEY=api_key_de_beds24 \
  BEDS24_PROP_KEY=prop_key_de_la_propiedad \
  BEDS24_TOTAL_ROOMS=29
```

- `BEDS24_API_KEY` → Beds24: **SETTINGS › ACCOUNT › ACCOUNT ACCESS**
- `BEDS24_PROP_KEY` → Beds24: **SETTINGS › PROPERTY › LINK › PROPKEY**
- `BEDS24_TOTAL_ROOMS` → nº total de habitaciones (denominador de ocupación/RevPAR). Por defecto 29 (L'Hostalet).

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY` los inyecta
> Supabase automáticamente en la función.

## Desplegar

```bash
supabase functions deploy beds24-report --no-verify-jwt
```

`--no-verify-jwt` deja que la función lea el JWT del header `Authorization` y haga
la verificación de rol en el código (necesario para el control Admin/Dirección).

## Probar

```bash
curl -X POST https://<tu-project-ref>.functions.supabase.co/beds24-report \
  -H "Authorization: Bearer <access_token_de_un_usuario_admin>" \
  -H "apikey: <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"desde":"2026-05-01","hasta":"2026-05-31"}'
```

## Notas importantes

- **No hay endpoint "Daily Financial Summary" en Beds24**: los ingresos/ocupación
  se calculan en la función a partir de `getBookings`. La fidelidad exacta al
  informe de Beds24 **se conserva mejor con el `.xls`** (que trae ADR/RevPAR
  pre-calculados). La conexión en vivo es para rangos a demanda sin exportar manualmente.
- `includeInvoice` solo devuelve datos si la consulta trae **<100 reservas**.
  L'Hostalet (29 hab.) está dentro de ese volumen en un mes; para rangos muy largos
  habría que paginar.
- Revisa el mapeo de campos de precio (`price`, `nights`, `guests`,
  `arrivalDate`/`departureDate`) contra tu cuenta real de Beds24 y ajusta
  `aggregateDaily()` si usan otros nombres.