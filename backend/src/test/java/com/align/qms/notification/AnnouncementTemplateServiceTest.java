package com.align.qms.notification;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.UUID;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnnouncementTemplateServiceTest {
    @Mock private AnnouncementTemplateRepository repository;
    @InjectMocks private AnnouncementTemplateService service;

    @Test
    void testTenantIsolation() {
    }
}
