package main

import (
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
)

func main() {
    http.Handle("/", http.FileServer(http.Dir("./static")))
    http.HandleFunc("/templates/", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, r.URL.Path[1:])
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "3000"
    }

    server := &http.Server{Addr: ":" + port}

    // Canal para recibir las señales del sistema
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

    // Iniciar el servidor en una goroutine
    go func() {
        log.Println("Iniciando servidor en el puerto " + port)
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Error en ListenAndServe: %v\n", err)
        }
    }()

    // Esperar una señal de parada
    <-stop

    // Realizar una parada limpia del servidor
    log.Println("Deteniendo servidor...")
    if err := server.Close(); err != nil {
        log.Fatalf("Error en la parada del servidor: %v\n", err)
    }
    log.Println("Servidor detenido.")
}
