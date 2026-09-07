/**
 * Application Layer: Use Cases
 * 
 * Use cases representam a lógica de aplicação pura, independente de HTTP.
 * São testáveis sem mocks de Request/Response.
 * 
 * Estrutura:
 * - Input: DTOs simples (objetos JS)
 * - Output: Result<Data, Error>
 * - Sem dependências de framework
 * - Orquestram domain + infrastructure
 */

// Re-export all use cases
export * from "./use-cases/guest";
export * from "./use-cases/admin";
export * from "./use-cases/wall";
