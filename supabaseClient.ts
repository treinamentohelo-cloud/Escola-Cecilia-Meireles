
// Configuração da API PHP na Hostinger
// Tenta ler do LocalStorage primeiro, senão usa um valor padrão
let API_URL = localStorage.getItem('school_app_api_url') || 'https://seu-dominio.hostingersite.com/api.php'; 

export const updateApiConfig = (url: string) => {
    // Remove barras no final para padronizar e espaços
    const cleanUrl = url.trim().replace(/\/$/, "");
    API_URL = cleanUrl;
    localStorage.setItem('school_app_api_url', cleanUrl);
};

export const getApiUrl = () => API_URL;

// Helper para converter camelCase (React) para snake_case (Banco de Dados)
function mapKeysToSnakeCase(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    // Se for FormData, não alteramos (tratado no POST)
    if (data instanceof FormData) return data;

    // Se for array, mapeia cada item
    if (Array.isArray(data)) {
        return data.map(mapKeysToSnakeCase);
    }

    const newData: any = {};
    for (const key in data) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        // Tratamento especial para arrays que devem virar JSON
        newData[snakeKey] = data[key];
    }
    return newData;
}

// Helper para simular Banco de Dados no LocalStorage (Fallback Offline)
const localDB = {
    getKey: (table: string) => `school_app_db_${table}`,
    
    get: (table: string) => {
        const data = localStorage.getItem(localDB.getKey(table));
        return data ? JSON.parse(data) : [];
    },
    
    save: (table: string, data: any[]) => {
        localStorage.setItem(localDB.getKey(table), JSON.stringify(data));
    },
    
    insert: (table: string, item: any) => {
        const data = localDB.get(table);
        const snakeItem = mapKeysToSnakeCase(item);
        
        // Garante que tenha ID
        if (!snakeItem.id) {
             snakeItem.id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        data.push(snakeItem);
        localDB.save(table, data);
        return { success: true, id: snakeItem.id };
    },
    
    update: (table: string, id: string, item: any) => {
        const data = localDB.get(table);
        const index = data.findIndex((i: any) => i.id === id);
        
        if (index !== -1) {
            const snakeItem = mapKeysToSnakeCase(item);
            // Mescla os dados existentes com os novos
            data[index] = { ...data[index], ...snakeItem };
            localDB.save(table, data);
            return { success: true };
        }
        return { success: false, error: 'Item not found locally' };
    },
    
    delete: (table: string, id: string) => {
        let data = localDB.get(table);
        data = data.filter((i: any) => i.id !== id);
        localDB.save(table, data);
        return { success: true };
    },
    
    login: (email: string, password: string) => {
        const users = localDB.get('users');
        const user = users.find((u: any) => u.email === email && u.password === password);
        return user || null;
    }
};

export const api = {
  // Check connection status
  checkConnection: async () => {
    // Evita tentar conectar se a URL for a padrão (placeholder)
    if (API_URL.includes('seu-dominio.hostingersite.com')) {
        return false;
    }

    try {
      const response = await fetch(`${API_URL}?table=health`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'online';
    } catch (e) {
      console.warn("Modo Offline ativado (API inacessível).");
      return false;
    }
  },

  // Buscar todos os registros de uma tabela
  get: async (table: string) => {
    try {
      if (API_URL.includes('seu-dominio.hostingersite.com')) throw new Error('URL não configurada');
      
      const response = await fetch(`${API_URL}?table=${table}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.warn(`API indisponível (${table}). Usando dados locais.`);
      return localDB.get(table);
    }
  },

  // Criar novo registro
  post: async (table: string, data: any) => {
    try {
      const response = await fetch(`${API_URL}?table=${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapKeysToSnakeCase(data))
      });
      if (!response.ok) throw new Error('API Error');
      return await response.json();
    } catch (error) {
      console.warn(`API indisponível. Salvando ${table} localmente.`);
      return localDB.insert(table, data);
    }
  },

  // Upload de Arquivo (Novo)
  upload: async (formData: FormData) => {
      try {
          const response = await fetch(`${API_URL}?action=upload`, {
              method: 'POST',
              body: formData // Fetch sets content-type multipart/form-data automatically
          });
          if (!response.ok) throw new Error('Upload Error');
          return await response.json();
      } catch (error) {
          console.error("Upload failed", error);
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
      if (!response.ok) throw new Error('API Error');
      return await response.json();
    } catch (error) {
      console.warn(`API indisponível. Atualizando ${table} localmente.`);
      return localDB.update(table, id, data);
    }
  },

  // Deletar registro
  delete: async (table: string, id: string) => {
    try {
      const response = await fetch(`${API_URL}?table=${table}&id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('API Error');
      return await response.json();
    } catch (error) {
       console.warn(`API indisponível. Removendo de ${table} localmente.`);
       return localDB.delete(table, id);
    }
  },

  // Login Admin/Prof
  login: async (email: string, password: string) => {
      try {
          const response = await fetch(`${API_URL}?table=login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
          });
          if (response.status === 401) return null;
          if (!response.ok) throw new Error('API Error');
          return await response.json();
      } catch (error) {
          console.warn("Erro no login API, tentando local.");
          return localDB.login(email, password);
      }
  },

  // Login Pais (Novo)
  parentLogin: async (registrationNumber: string, birthDate: string) => {
      try {
          const response = await fetch(`${API_URL}?action=parent_login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ registration_number: registrationNumber, birth_date: birthDate })
          });
          if (response.status === 401) return null;
          if (!response.ok) throw new Error('API Error');
          return await response.json();
      } catch (error) {
          console.error("Parent login error", error);
          return null;
      }
  }
};
