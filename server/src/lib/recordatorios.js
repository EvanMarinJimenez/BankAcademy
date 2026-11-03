import { supabaseAdmin } from './supabase.js'

const INTERVALO_MS = 60_000

export function formatearFecha(fecha) {
  return new Date(fecha).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// HUL13: el recordatorio se debe desde que abre la ventana hasta el inicio de la llamada.
// Usar una ventana permite ponerse al día si el servidor estuvo apagado o si se asigna
// a alguien después de que la ventana abrió.
export function debeEnviarRecordatorio(simulacion, ahora = new Date()) {
  const config = simulacion.parametros?.recordatorio
  if (simulacion.estado !== 'programada' || !config?.activo || !simulacion.fecha_inicio) return false

  const inicio = new Date(simulacion.fecha_inicio).getTime()
  const horasAntes = Number(config.horas_antes)
  if (Number.isNaN(inicio) || !(horasAntes > 0)) return false

  const momento = ahora.getTime()
  return momento < inicio && momento >= inicio - horasAntes * 60 * 60 * 1000
}

// Devuelve cuántos participantes asignados tiene la simulación.
export async function notificarParticipantes(simulacion, { tipo, titulo, mensaje }) {
  const { data: participantes, error: errorParticipantes } = await supabaseAdmin
    .from('participante_simulacion')
    .select('profile_id')
    .eq('id_simulacion', simulacion.id_simulacion)

  if (errorParticipantes) throw errorParticipantes
  if (!participantes?.length) return 0

  const fechaObjetivo = simulacion.fecha_inicio || new Date().toISOString()
  const filas = participantes.map(({ profile_id }) => ({
    profile_id,
    id_simulacion: simulacion.id_simulacion,
    tipo,
    titulo,
    mensaje,
    fecha_objetivo: fechaObjetivo,
  }))

  const { error } = await supabaseAdmin
    .from('notificacion')
    .upsert(filas, {
      onConflict: 'profile_id,id_simulacion,tipo,fecha_objetivo',
      ignoreDuplicates: true,
    })

  if (error) throw error
  return filas.length
}

export async function enviarRecordatoriosPendientes(ahora = new Date()) {
  const { data, error } = await supabaseAdmin
    .from('simulacion')
    .select('id_simulacion, nombre, estado, fecha_inicio, parametros')
    .eq('estado', 'programada')
    .not('fecha_inicio', 'is', null)

  if (error) throw error

  // Solo consulta estados 'programada': cancelar una llamada frena sus recordatorios.
  for (const simulacion of data.filter((s) => debeEnviarRecordatorio(s, ahora))) {
    await notificarParticipantes(simulacion, {
      tipo: 'recordatorio',
      titulo: 'Recordatorio de llamada programada',
      mensaje: `Tu llamada "${simulacion.nombre}" está programada para el ${formatearFecha(simulacion.fecha_inicio)}`,
    })
  }
}

export function iniciarRecordatorios() {
  let enCurso = false

  const ejecutar = async () => {
    if (enCurso) return
    enCurso = true
    try {
      await enviarRecordatoriosPendientes()
    } catch (err) {
      console.error('Error enviando recordatorios:', err.message || err)
    } finally {
      enCurso = false
    }
  }

  ejecutar()
  return setInterval(ejecutar, INTERVALO_MS)
}
