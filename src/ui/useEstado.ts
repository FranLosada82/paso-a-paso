import { useCallback, useEffect, useRef, useState } from 'react';
import { cargarEstado, guardarEstado, pedirPersistencia } from '../storage/db';
import type { Estado } from '../storage/estado';
import { ASIGNATURAS } from '../content/asignaturas';
import { finDeTemaEn } from '../logic/paginas';

export function useEstado() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const cargado = useRef(false);

  useEffect(() => {
    cargarEstado(finDeTemaEn(ASIGNATURAS)).then((e) => { cargado.current = true; setEstado(e); });
    pedirPersistencia();
  }, []);

  useEffect(() => {
    if (!estado || !cargado.current) return;
    guardarEstado(estado).then(() => setErrorGuardado(false), () => setErrorGuardado(true));
  }, [estado]);

  const actualizar = useCallback((f: (e: Estado) => Estado) => setEstado((e) => (e ? f(e) : e)), []);
  return { estado, actualizar, reemplazar: setEstado, errorGuardado };
}
