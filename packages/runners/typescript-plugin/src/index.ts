import type {
  CodeFixAction,
  FormatCodeSettings,
  LanguageService,
  server,
  UserPreferences,
} from "typescript/lib/tsserverlibrary";
import { getCodeFixes } from "./code-fixes";
import { getCustomDiagnostics } from "./diagnostics";
import { getHoverInfo } from "./hover";

type PluginConfig = {
  enableDiagnostics?: boolean;
  enableCompletions?: boolean;
};

function init(modules: {
  typescript: typeof import("typescript/lib/tsserverlibrary");
}) {
  const ts = modules.typescript;

  function create(info: server.PluginCreateInfo) {
    try {
      // Log plugin initialization
      info.project.projectService.logger.info(
        "@runners/typescript-plugin: Initializing plugin"
      );

      // Get plugin configuration
      const config: PluginConfig = info.config || {};
      const enableDiagnostics = config.enableDiagnostics !== false;

      info.project.projectService.logger.info(
        `@runners/typescript-plugin: Diagnostics=${enableDiagnostics}`
      );

      // Set up decorator object
      const proxy: LanguageService = Object.create(null);
      for (const k of Object.keys(info.languageService) as Array<
        keyof LanguageService
      >) {
        const x = info.languageService[k];
        if (!x) {
          continue;
        }
        proxy[k] = (...args: unknown[]) => x.apply(info.languageService, args);
      }

      // Enhance semantic diagnostics
      if (enableDiagnostics) {
        proxy.getSemanticDiagnostics = (fileName: string) => {
          const prior = info.languageService.getSemanticDiagnostics(fileName);
          try {
            const program = info.languageService.getProgram();
            if (!program) {
              return prior;
            }

            const customDiagnostics = getCustomDiagnostics(
              fileName,
              program,
              ts
            );

            return [...prior, ...customDiagnostics];
          } catch (error) {
            info.project.projectService.logger.info(
              `@runners/typescript-plugin: Error in getSemanticDiagnostics: ${error}`
            );
            return prior;
          }
        };
      }

      // Provide hover information
      proxy.getQuickInfoAtPosition = (fileName: string, position: number) => {
        const prior = info.languageService.getQuickInfoAtPosition(
          fileName,
          position
        );
        try {
          const program = info.languageService.getProgram();
          if (!program) {
            return prior;
          }

          const hoverInfo = getHoverInfo(fileName, position, program, ts);

          // If we have hover info for a directive, use it; otherwise use prior
          return hoverInfo || prior;
        } catch (error) {
          info.project.projectService.logger.info(
            `@runners/typescript-plugin: Error in getQuickInfoAtPosition: ${error}`
          );
          return prior;
        }
      };

      // Provide code fixes for diagnostics
      if (enableDiagnostics) {
        // biome-ignore lint/nursery/useMaxParams: this is a workaround to avoid the max params error
        proxy.getCodeFixesAtPosition = (
          fileName: string,
          start: number,
          end: number,
          errorCodes: number[],
          formatOptions: FormatCodeSettings,
          preferences: UserPreferences
        ) => {
          const prior = info.languageService.getCodeFixesAtPosition(
            fileName,
            start,
            end,
            errorCodes,
            formatOptions,
            preferences
          );
          try {
            const program = info.languageService.getProgram();
            if (!program) {
              return prior;
            }

            const customFixes: CodeFixAction[] = [];
            for (const errorCode of errorCodes) {
              const fixes = getCodeFixes(fileName, start, end, {
                errorCode,
                program,
                ts,
              });
              customFixes.push(...fixes);
            }

            return [...prior, ...customFixes];
          } catch (error) {
            info.project.projectService.logger.info(
              `@runners/typescript-plugin: Error in getCodeFixesAtPosition: ${error}`
            );
            return prior;
          }
        };
      }

      info.project.projectService.logger.info(
        "@runners/typescript-plugin loaded successfully"
      );

      return proxy;
    } catch (error) {
      info.project.projectService.logger.info(
        `@runners/typescript-plugin: Error initializing plugin: ${error}`
      );
      // Return the original language service if plugin fails
      return info.languageService;
    }
  }

  return { create };
}

export = init;
