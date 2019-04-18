DROP DATABASE project;
CREATE DATABASE project;
USE project;



CREATE TABLE location (
    id char(36) PRIMARY KEY,
    address varchar(100) UNIQUE NOT NULL
);

CREATE TABLE institution(
    id char(36) PRIMARY KEY,
    tax_id char(10) UNIQUE
);

CREATE TABLE department(
    id char(36) PRIMARY KEY,
    institution_id char(36),
    FOREIGN KEY (institution_id) REFERENCES institution(id)
);

CREATE TABLE service(
    id char(36) PRIMARY KEY,
    location_id char(36),
    department_id char(36),
    institution_id char(36),
    FOREIGN KEY (location_id) REFERENCES location(id),
    FOREIGN KEY (department_id) REFERENCES department(id),
    FOREIGN KEY (institution_id) REFERENCES institution(id)
);

CREATE TABLE provider(
    npi varchar(20) PRIMARY KEY,
    department_id char(36),
    FOREIGN KEY (department_id) REFERENCES department(id)
);

CREATE TABLE patient(
    id char(36) PRIMARY KEY,
    ssn char(12) UNIQUE,
    address_id char(36),
    primary_care_provider char(20),
    FOREIGN KEY(primary_care_provider) REFERENCES provider(npi),
    FOREIGN KEY(address_id) REFERENCES location(id)
);

CREATE TABLE data(
    id char(36) PRIMARY KEY,
    time timestamp,
    patient_id char(36),
    service_id char(36),
    FOREIGN KEY(patient_id) REFERENCES patient(id),
    FOREIGN KEY(service_id) REFERENCES service(id)
);