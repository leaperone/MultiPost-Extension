/**
 * 通用AI响应JSON解析工具
 * 支持多种格式的AI响应解析，包括标准markdown代码块和纯JSON格式
 */

interface AIParseResult<T> {
    success: boolean;
    data?: T;
    error?: string;
  }
  
  /**
   * 解析AI响应中的JSON内容
   * @param content AI响应的原始内容
   * @param requiredFields 必需的字段数组，用于验证JSON结构
   * @returns 解析结果
   */
  export function parseAIResponse<T extends Record<string, unknown>>(
    content: string,
    requiredFields: string[] = [],
  ): AIParseResult<T> {
    if (!content || typeof content !== 'string') {
      return { success: false, error: 'Invalid content' };
    }
  
    let parsedData: T | undefined;
  
    // 1. 尝试标准markdown代码块格式 (```json\n...\n```)
    let match = content.match(/```json\n([\s\S]+?)\n```/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (validateRequiredFields(parsed, requiredFields)) {
          parsedData = parsed;
        }
      } catch (error) {
        console.error('Failed to parse standard JSON format:', error);
      }
    }
  
    // 2. 尝试没有换行的markdown代码块格式 (```json\n...```)
    if (!parsedData) {
      match = content.match(/```json\n([\s\S]+?)```/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (validateRequiredFields(parsed, requiredFields)) {
            parsedData = parsed;
          }
        } catch (error) {
          console.error('Failed to parse no-newline JSON format:', error);
        }
      }
    }
  
    // 3. 尝试纯JSON格式（没有markdown包装）
    if (!parsedData) {
      match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (validateRequiredFields(parsed, requiredFields)) {
            parsedData = parsed;
          }
        } catch (error) {
          console.error('Failed to parse pure JSON format:', error);
        }
      }
    }
  
    if (parsedData) {
      return { success: true, data: parsedData };
    }
  
    return { success: false, error: 'No valid JSON found in response' };
  }
  
  /**
   * 验证JSON对象是否包含必需的字段
   * @param obj 要验证的对象
   * @param requiredFields 必需的字段数组
   * @returns 是否验证通过
   */
  function validateRequiredFields(obj: unknown, requiredFields: string[]): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
  
    if (requiredFields.length === 0) {
      return true;
    }
  
    return requiredFields.every((field) => obj.hasOwnProperty(field));
  }
  
  /**
   * 专门用于解析包含thoughts字段的AI响应
   * @param content AI响应的原始内容
   * @returns 解析结果
   */
  export function parseThoughtsResponse<T extends { thoughts: string }>(content: string): AIParseResult<T> {
    return parseAIResponse<T>(content, ['thoughts']);
  }
  
  /**
   * 专门用于解析包含prompt字段的AI响应
   * @param content AI响应的原始内容
   * @returns 解析结果
   */
  export function parsePromptResponse<T extends { prompt: string }>(content: string): AIParseResult<T> {
    return parseAIResponse<T>(content, ['prompt']);
  }
  
  /**
   * 专门用于解析包含title和content字段的AI响应
   * @param content AI响应的原始内容
   * @returns 解析结果
   */
  export function parseTitleContentResponse<T extends { title?: string; content?: string }>(
    content: string,
  ): AIParseResult<T> {
    return parseAIResponse<T>(content, []);
  }
  