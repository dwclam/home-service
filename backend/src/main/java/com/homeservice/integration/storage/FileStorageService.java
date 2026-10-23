package com.homeservice.integration.storage;

public interface FileStorageService {
    String storeFile(byte[] fileBytes, String fileName);
}
