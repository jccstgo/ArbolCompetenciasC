const initialData = {
  id: 1,
  name: 'Oficial de Estado Mayor',
  type: 'trunk',
  children: [
    {
      id: 2,
      name: 'Fundamentos Doctrinarios y Éticos',
      type: 'root',
      children: [
        { id: 3, name: 'Derecho Internacional Humanitario', type: 'root' },
        { id: 4, name: 'Ética Militar y Liderazgo Moral', type: 'root' },
        { id: 5, name: 'Principios de la Guerra y Pensamiento Estratégico', type: 'root' },
      ],
    },
    {
      id: 6,
      name: 'Base Jurídica e Institucional',
      type: 'root',
      children: [
        { id: 7, name: 'Constitución, Leyes y Rol de las FF.AA.', type: 'root' },
        { id: 8, name: 'Derechos Humanos y Uso Proporcional de la Fuerza', type: 'root' },
        { id: 23, name: 'Reglas de Enfrentamiento (ROE) y Marco Operacional', type: 'root' },
      ],
    },
    {
      id: 24,
      name: 'Cultura y Desarrollo Profesional',
      type: 'root',
      children: [
        { id: 25, name: 'Disciplina, Responsabilidad y Rendición de Cuentas', type: 'root' },
        { id: 26, name: 'Aprendizaje Continuo y Gestión del Conocimiento', type: 'root' },
      ],
    },
    {
      id: 9,
      name: 'Liderazgo Estratégico',
      type: 'branch',
      children: [
        {
          id: 10,
          name: 'Toma de Decisiones en Entornos Complejos',
          type: 'branch',
          children: [
            { id: 11, name: 'Gestión de Crisis', type: 'fruit', mastery: 85 },
            { id: 12, name: 'Análisis Situacional', type: 'fruit', mastery: 90 },
            { id: 27, name: 'Comunicación en Crisis', type: 'fruit', mastery: 82 },
          ],
        },
        {
          id: 28,
          name: 'Comunicación Estratégica',
          type: 'branch',
          children: [
            { id: 13, name: 'Comunicación Efectiva', type: 'fruit', mastery: 92 },
            { id: 29, name: 'Negociación y Persuasión', type: 'fruit', mastery: 84 },
          ],
        },
      ],
    },
    {
      id: 14,
      name: 'Operaciones Conjuntas',
      type: 'branch',
      children: [
        {
          id: 15,
          name: 'Planeamiento Operacional',
          type: 'branch',
          children: [
            {
              id: 30,
              name: 'Análisis del Entorno Operacional',
              type: 'branch',
              children: [
                { id: 16, name: 'JIPOE', type: 'fruit', mastery: 88 },
                { id: 17, name: 'Análisis de COA', type: 'fruit', mastery: 78 },
              ],
            },
            { id: 18, name: 'SIMOP', type: 'fruit', mastery: 82 },
          ],
        },
        { id: 19, name: 'C4ISR', type: 'fruit', mastery: 75 },
        { id: 31, name: 'Coordinación Interagencial', type: 'fruit', mastery: 80 },
      ],
    },
    {
      id: 20,
      name: 'Tecnología Militar',
      type: 'branch',
      children: [
        {
          id: 32,
          name: 'Sistemas y Datos',
          type: 'branch',
          children: [
            { id: 21, name: 'Sistemas de Información', type: 'fruit', mastery: 94 },
            { id: 33, name: 'Arquitecturas de Datos y Calidad', type: 'fruit', mastery: 86 },
          ],
        },
        { id: 22, name: 'Ciberseguridad', type: 'fruit', mastery: 87 },
      ],
    },
    {
      id: 34,
      name: 'Logística y Sostenimiento',
      type: 'branch',
      children: [
        { id: 35, name: 'Gestión de Recursos y Prioridades', type: 'fruit', mastery: 79 },
        { id: 36, name: 'Cadena de Suministro y Abastecimiento', type: 'fruit', mastery: 77 },
      ],
    },
  ],
};

export default initialData;
