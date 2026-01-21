
// Configuração da API PHP na Hostinger
// URL corrigida para o seu domínio na Hostinger
const API_URL = 'https://lightblue-boar-874757.hostingersite.com/api.php'; 

export const api = {
  // Check connection status
  checkConnection: async () => {
    try {
      const response = await fetch(`${API_URL}?table=health`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'online';
    } catch (e) {
      return false;
    }
  },

  // Buscar todos os registros de uma tabela
  get: async (table: string) => {
    try {
      const response = await fetch(`${API_URL}?table=${table}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error(`Erro ao buscar ${table}:`, error);
      return [];
    }
  },

  // Criar novo registro
  post: async (table: string, data: any) => {
    try {
      // Garantir snake_case para o banco se necessário, ou enviar como está se o PHP tratar
      const response = await fetch(`${API_URL}?table=${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapKeysToSnakeCase(data))
      });
      return await response.json();
    } catch (error) {
      console.error(`Erro ao criar em ${table}:`, error);
      throw error;
    }
  },

  // Atualizar registro
  put: async (table: string, id: string, data: any) => {
    try {
      const response = await fetch(`${API_URL}?table=${table}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapKeysToSnakeCase(data))
      });
      return await response.json();
    } catch (error) {
      console.error(`Erro ao atualizar em ${table}:`, error);
      throw error;
    }
  },

  // Deletar registro
  delete: async (table: string, id: string) => {
    try {
      const response = await fetch(`${API_URL}?table=${table}&id=${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error(`Erro ao deletar em ${table}:`, error);
      throw error;
    }
  },

  // Login específico
  login: async (email: string, password: string) => {
      try {
          const response = await fetch(`${API_URL}?table=login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
          });
          if (response.status === 401) return null;
          return await response.json();
      } catch (error) {
          console.error("Erro no login:", error);
          return null;
      }
  }
};

// Helper para converter camelCase (React) para snake_case (Banco de Dados)
// Ex: classId -> class_id
function mapKeysToSnakeCase(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    // Se for array, mapeia cada item
    if (Array.isArray(data)) {
        return data.map(mapKeysToSnakeCase);
    }

    const newData: any = {};
    for (const key in data) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        // Tratamento especial para arrays que devem virar JSON
        // O PHP já trata, mas aqui garantimos que teacherIds vire teacher_ids
        newData[snakeKey] = data[key];
    }
    return newData;
}
