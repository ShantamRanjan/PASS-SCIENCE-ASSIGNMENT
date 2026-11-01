#include "nexus/api/ApiServer.hpp"
#include <iostream>
#include <string>
#ifndef NEXUS_VERSION
#define NEXUS_VERSION "dev"
#endif
int main(int argc,char**argv){
    int port=7878; if(argc>1){try{port=std::stoi(argv[1]);}catch(...){std::cerr<<"Invalid port\n";return 2;}}
    std::cout<<"NEXUS C++17 backend "<<NEXUS_VERSION<<"\nListening on http://127.0.0.1:"<<port<<"\n";
    if(!nexus::api::runServer("127.0.0.1",port)){std::cerr<<"Could not start server (port may be in use).\n";return 1;} return 0;
}
