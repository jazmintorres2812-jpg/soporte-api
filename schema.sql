-- Ejecutar en el SQL Editor de Neon
CREATE SEQUENCE IF NOT EXISTS folio_seq START 1;

CREATE TABLE IF NOT EXISTS solicitudes (
  id          SERIAL PRIMARY KEY,
  folio       VARCHAR(20) UNIQUE NOT NULL
              DEFAULT ('SOL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('folio_seq')::text, 5, '0')),
  nombre      VARCHAR(120) NOT NULL,
  correo      VARCHAR(150) NOT NULL,
  categoria   VARCHAR(50)  NOT NULL,
  prioridad   VARCHAR(20)  NOT NULL CHECK (prioridad IN ('Baja','Media','Alta','Urgente')),
  descripcion TEXT NOT NULL,
  estado      VARCHAR(20)  NOT NULL DEFAULT 'Abierta',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_categoria ON solicitudes(categoria);
CREATE INDEX IF NOT EXISTS idx_solicitudes_prioridad ON solicitudes(prioridad);
