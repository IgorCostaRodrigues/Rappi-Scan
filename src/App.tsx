/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Camera, RefreshCcw, Package, AlertCircle, ScanLine } from "lucide-react";
import Barcode from "react-barcode";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ean, setEan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setEan(null);

    try {
      // Comprime a imagem levemente para melhorar a velocidade sem perder detalhes finos do texto
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 1600; // Aumentado para não embaçar os números do EAN
          let { width, height } = img;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Erro no canvas"));
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.9)); // Qualidade 90% para manter os textos nítidos
        };
        img.onerror = () => reject(new Error("Erro ao carregar a imagem"));
        img.src = URL.createObjectURL(file);
      });

      setImage(compressedBase64);

      const response = await fetch("/api/extract-ean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: compressedBase64 }),
      });

      if (!response.ok) {
        throw new Error("Falha ao processar a imagem. Tente novamente.");
      }

      const data = await response.json();
      if (data.ean) {
        setEan(data.ean);
      } else {
        setError("Não foi possível identificar um EAN na imagem.");
      }
    } catch (err: any) {
      setError(err.message || "Erro desconhecido de rede.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setEan(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Header (Rappi Identity) */}
      <header className="bg-[#FF5000] text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tight">EAN Scanner</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 mt-4">
        {/* Intro / Action Area */}
        {!image && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="w-16 h-16 bg-orange-100 text-[#FF5000] rounded-full flex items-center justify-center mx-auto">
                <Package className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                Capturar Produto
              </h2>
              <p className="text-gray-500 text-sm">
                Tire uma foto da tela ou do produto para identificar o código de
                barras automaticamente.
              </p>
              
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleCapture}
                className="hidden"
              />
              
              <button
                onClick={triggerCamera}
                className="w-full bg-[#FF5000] hover:bg-[#E64800] text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-[0.98]"
              >
                <Camera className="w-5 h-5" />
                Abrir Câmera
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-[#FF5000] rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium animate-pulse">
              Analisando imagem com IA...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-red-700 font-medium">{error}</p>
            <button
              onClick={handleReset}
              className="text-[#FF5000] font-semibold flex items-center justify-center gap-2 w-full py-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Result State */}
        {ean && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Captured Image Preview */}
            {image && (
              <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-black aspect-video flex items-center justify-center">
                <img
                  src={image}
                  alt="Captura"
                  className="max-w-full max-h-full object-contain opacity-80"
                />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-medium">
                  Imagem Original
                </div>
              </div>
            )}

            {/* Extracted Data Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">
                  EAN Identificado
                </p>
                <p className="text-3xl font-mono font-bold text-gray-900 tracking-tight">
                  {ean}
                </p>
              </div>

              <div className="h-px bg-gray-100 w-full" />

              {/* Generated Barcodes */}
              <div className="space-y-6">
                {/* Barcode */}
                <div className="space-y-4 flex flex-col items-center overflow-hidden">
                  <div className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-2">
                    <ScanLine className="w-4 h-4" />
                    Código de Barras Gerado
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <Barcode 
                      value={ean} 
                      format={ean.length === 13 ? "EAN13" : "CODE128"} 
                      width={2} 
                      height={80} 
                      displayValue={true} 
                      background="transparent" 
                      lineColor="#000000" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-white border-2 border-[#FF5000] text-[#FF5000] hover:bg-orange-50 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Camera className="w-5 h-5" />
              Escanear Novo Produto
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

