// --- Definición de clases ---
export class Sesion {
  constructor(tipo, dia, horaInicio, horaFin, profesor, aula) {
    this.tipo = tipo; // 'T', 'P', 'L'
    this.dia = dia;   // 'Lunes', 'Martes', etc.
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.profesor = profesor;
    this.aula = aula;
  }

  toString() {
    return `${this.tipo} (${this.dia} ${this.horaInicio}-${this.horaFin})`;
  }
}

export class Curso {
  constructor(nombre) {
    this.nombre = nombre;
    this.opciones = []; // Cada opción es un arreglo de sesiones
  }

  agregarOpcion(sesiones) {
    this.opciones.push(sesiones);
  }
}

// --- Funciones ---
export function esValido(horario) {
  for (let i = 0; i < horario.length; i++) {
    for (let j = i + 1; j < horario.length; j++) {
      if (horario[i].dia === horario[j].dia) {
        if (!(horario[i].horaFin <= horario[j].horaInicio ||
              horario[j].horaFin <= horario[i].horaInicio)) {
          return false;
        }
      }
    }
  }
  return true;
}

export function generarHorarios(cursos, filtro = null) {
  // Genera todas las combinaciones posibles sin choques y aplicando filtro
  const opcionesPorCurso = cursos.map(curso => curso.opciones);
  const horariosPosibles = [];

  function product(arrays, prefix = []) {
    if (!arrays.length) return [prefix];
    return arrays[0].flatMap(option => product(arrays.slice(1), [...prefix, option]));
  }

  for (const combinacion of product(opcionesPorCurso)) {
    const sesiones = combinacion.flat();
    if (esValido(sesiones)) {
      if (!filtro || filtro(sesiones)) {
        horariosPosibles.push(sesiones);
      }
    }
  }
  return horariosPosibles;
}

// --- Filtros ---
export function soloManana(horario) {
  return horario.every(s => s.horaFin <= 12);
}

export function soloTarde(horario) {
  return horario.every(s => s.horaInicio >= 13);
}

export function diaLibre(horario, dia) {
  return horario.every(s => s.dia !== dia);
}
